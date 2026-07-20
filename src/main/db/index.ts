import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { applyPendingRestore } from '../backup'
import { DB_FILENAME } from '../../shared/app-meta'

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
