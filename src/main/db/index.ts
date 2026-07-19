import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { applyPendingRestore } from '../backup'

export type Db = ReturnType<typeof createDb>

/**
 * DB を開いてマイグレーションを適用する。
 *
 * better-sqlite3 は同期 API なので、IPC ハンドラから直接呼べる（映棚と同じ設計）。
 * Drizzle の migrator が drizzle/ 配下の SQL を順に当て、適用済みは
 * __drizzle_migrations テーブルで管理される＝自前のマイグレーション機構は不要。
 */
export function createDb() {
  const file = join(app.getPath('userData'), 'app-kit.db')

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

function resolveMigrationsFolder(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'drizzle')
    : join(app.getAppPath(), 'drizzle')
}
