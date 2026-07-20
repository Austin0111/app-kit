import { expect, test } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * **配布版（パッケージ済み）が実際に動くか**を確かめる。
 *
 * 開発時に通っても配布版で壊れる、という事故は起きうる。実際この雛形でも
 * 「マイグレーションの場所が起動のされ方で変わる」問題を踏んでいる。
 * 配布版では `app.isPackaged` が真になり、drizzle と CHANGELOG を
 * `process.resourcesPath` から読む**別の経路**に入る。ここは開発時に一度も通らない。
 *
 * `npm run dist` を実行していない場合は飛ばす（毎回ビルドすると重すぎるため）。
 * 配布前には必ず一度これを通すこと。
 */

const EXE = join('dist', 'win-unpacked', 'app-kit.exe')

test.describe('配布版', () => {
  test.skip(!existsSync(EXE), '`npm run dist` を実行してから確かめること')

  test('パッケージ版が起動し、DBと変更履歴を読める', async () => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'e2e-packaged-'))

    const app = await electron.launch({
      executablePath: EXE,
      env: { ...process.env, APP_USER_DATA_DIR: userDataDir }
    })

    try {
      const page = await app.firstWindow()
      await page.waitForSelector('.titlebar', { timeout: 20_000 })

      // 画面が出た＝マイグレーションが resources から読めている
      // （読めなければ起動時に失敗ダイアログを出して終了する）
      await expect(page.getByText('設定を読み込み済み')).toBeVisible()

      // 版が package.json と一致する（ビルド時に埋め込まれた値）
      const expected = JSON.parse(readFileSync('package.json', 'utf8')).version
      await expect(page.locator('.version__label')).toHaveText(`v${expected}`)

      // CHANGELOG も resources から読めるか（extraResources の確認）
      await page.locator('.version__label').click()
      await expect(page.locator('.changelog')).toContainText('更新履歴')

      // DB への書き込みが通るか（better-sqlite3 が asar の外で動いているか）
      await page.locator('dialog.dialog').getByRole('button', { name: '閉じる' }).click()
      await page.getByPlaceholder('何か書いて Enter').fill('配布版の確認')
      await page.getByRole('button', { name: '追加' }).click()
      await expect(page.getByText('配布版の確認')).toBeVisible()
    } finally {
      await app.close()
      try {
        rmSync(userDataDir, { recursive: true, force: true })
      } catch {
        // 掴まれたままなら残る。一時フォルダなので放っておいてよい
      }
    }
  })
})
