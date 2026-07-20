import { defineConfig } from '@playwright/test'

/**
 * Electron を実際に起動して確かめるための設定。
 *
 * ブラウザは使わないので `npx playwright install` は不要
 * （_electron.launch がアプリ本体の Electron を起動する）。
 */
export default defineConfig({
  testDir: './tests',
  // 同じ userData を複数プロセスが掴むと SQLite がロック競合するので直列で回す
  workers: 1,
  fullyParallel: false,
  // 失敗を握り潰さない。落ちたら落ちたまま報告する
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  outputDir: './test-results'
})
