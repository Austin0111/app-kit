import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * 設定の KV テーブル。
 * 棚卸しで 4 本（映棚 / CommandDeck / PixNest / XNest）が独立に同じ形へ到達した型。
 * 設定用の別ファイルを持たず、ここに全部寄せる。
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
})

/**
 * 動作確認用の適当なテーブル。
 * Drizzle の「あとから列を足す」流れを試すための的でもある。
 */
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  // ↓ あとから足した列。drizzle-kit が差分を見て ALTER を生成できるかの試験。
  done: integer('done', { mode: 'boolean' }).notNull().default(false)
})

export type Setting = typeof settings.$inferSelect
export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
