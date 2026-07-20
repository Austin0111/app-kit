import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { applyPendingRestore } from '../backup'
import { DB_FILENAME } from '../../shared/app-meta'
import { log } from '../log'

export type Db = ReturnType<typeof createDb>

/**
 * DB を開いてマイグレーションを適用する。
 *
 * better-sqlite3 は同期 API なので、IPC ハンドラから直接呼べる（映棚と同じ設計）。
 * Drizzle の migrator が drizzle/ 配下の SQL を順に当て、適用済みは
 * __drizzle_migrations テーブルで管理される＝自前のマイグレーション機構は不要。
 */
export function createDb() {
  const file = join(app.getPath('userData'), DB_FILENAME)

  // 復元ファイルの適用は「DB を開く前」でなければならない。
  // 開いた後だとファイルを掴んでいて置き換えられない（実機で確認済み）。
  applyPendingRestore(file)

  const sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // 起動時の軽い整合性チェック（映棚の作法）。
  // 壊れていることに「クエリが失敗して初めて気づく」事態を避ける。
  // quick_check は full な integrity_check より軽く、起動を待たせない。
  // **落とさない。** 壊れていても読める部分はあるし、ここで止めると
  // バックアップからの復元すらできなくなる。
  try {
    const rows = sqlite.pragma('quick_check') as { quick_check: string }[]
    const ok = rows.length === 1 && rows[0]?.quick_check === 'ok'
    if (!ok) {
      log.error('データベースに異常が見つかった。バックアップからの復元を検討してほしい', {
        結果: rows.slice(0, 5),
        ファイル: file
      })
    }
  } catch (err) {
    log.warn('整合性チェックを実行できなかった', { 詳細: err })
  }

  const db = drizzle(sqlite, { schema })

  // migrationsFolder はビルド後もリポジトリ相対で解決したいので、
  // 開発時はプロジェクト直下、パッケージ後は resources 配下を見る。
  migrate(db, { migrationsFolder: resolveMigrationsFolder() })

  return { db, sqlite, file }
}

/**
 * マイグレーション（drizzle/）の場所を探す。
 *
 * **`app.getAppPath()` だけに頼ってはいけない。** 起動のされ方で値が変わる。
 * `electron out/main/index.js` のように直接起動した場合（自動テストがこの形）に
 * 外れて `Can't find meta/_journal.json` で起動できなくなる。実際に踏んだ。
 *
 * 候補を順に見て、実際に journal がある場所を採る。
 */
function resolveMigrationsFolder(): string {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'drizzle')]
    : [
        // out/main/index.js から見たリポジトリ直下
        join(__dirname, '..', '..', 'drizzle'),
        join(app.getAppPath(), 'drizzle'),
        join(process.cwd(), 'drizzle')
      ]

  for (const dir of candidates) {
    if (existsSync(join(dir, 'meta', '_journal.json'))) return dir
  }

  // 見つからない場合も、どこを探したのかを残す（黙って落ちると原因が分からない）
  throw new Error(
    `マイグレーション（drizzle/）が見つからない。探した場所:\n  ${candidates.join('\n  ')}`
  )
}
