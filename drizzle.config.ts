import type { Config } from 'drizzle-kit'

// drizzle-kit はここを見て schema.ts と drizzle/ 配下の差分を計算し、
// マイグレーション SQL を生成する（`npm run db:generate`）。
// 生成物はリポジトリに commit して、実行時は migrator が順に適用する。
export default {
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite'
} satisfies Config
