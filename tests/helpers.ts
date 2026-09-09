import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * テスト用にアプリを起動する。
 *
 * 【本番のデータを壊さないこと】
 * userData は環境変数で一時フォルダへ差し替える。
 * これをしないと、テストが主殿の実際の設定・DB・バックアップを書き換えてしまう。
 */
export type Launched = {
  app: ElectronApplication
  page: Page
  /** 起動中に出たコンソールのエラー。完了条件の「Console Error 0」に使う */
  consoleErrors: string[]
  userDataDir: string
  close: () => Promise<void>
}

export async function launchApp(options: {
  userDataDir?: string
  removeUserDataOnClose?: boolean
} = {}): Promise<Launched> {
  const userDataDir = options.userDataDir ?? mkdtempSync(join(tmpdir(), 'e2e-test-'))
  const removeUserDataOnClose = options.removeUserDataOnClose ?? options.userDataDir === undefined

  const app = await electron.launch({
    args: ['out/main/index.js'],
    // APP_E2E=1 で、検証用の仕掛け（描画をわざと壊すボタン等）が出るようになる
    env: { ...process.env, APP_USER_DATA_DIR: userDataDir, NODE_ENV: 'test', APP_E2E: '1' }
  })

  const page = await app.firstWindow()

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  // 描画が終わるまで待つ（タイトルバーは常にあるので目印にする）
  await page.waitForSelector('.titlebar', { timeout: 15_000 })

  return {
    app,
    page,
    consoleErrors,
    userDataDir,
    close: async () => {
      await app.close()
      if (removeUserDataOnClose) {
        try {
          rmSync(userDataDir, { recursive: true, force: true })
        } catch {
          // 掴まれたままなら残る。一時フォルダなので放っておいてよい
        }
      }
    }
  }
}
