import { expect, test } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * 再起動を跨ぐ確認。
 *
 * **手作業では確かめにくく、壊れても気づきにくい**種類のもの。
 * 設定KV とバックアップは「次に開いた時に効いているか」が本質なので、
 * ここを自動で見張れる意味は大きい。
 */
test('設定は再起動しても残る', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'e2e-persist-'))
  const env = { ...process.env, APP_USER_DATA_DIR: userDataDir }

  // ── 1 回目: 単一選択と即時反映の二値設定を切り替える ──
  const first = await electron.launch({ args: ['out/main/index.js'], env })
  const page1 = await first.firstWindow()
  await page1.waitForSelector('.titlebar')

  const theme1 = page1.getByRole('combobox', { name: 'テーマ' })
  const status1 = page1.getByRole('switch', { name: 'ステータスバーを表示' })
  await expect(theme1).toHaveValue('dark')
  await theme1.selectOption('light')
  await expect(page1.locator('.app-shell')).toHaveAttribute('data-theme', 'light')
  await expect(status1).toHaveAttribute('aria-checked', 'true')
  await status1.click()
  await expect(status1).toHaveAttribute('aria-checked', 'false')
  await expect(page1.locator('.statusbar')).toHaveCount(0)
  await expect.poll(() => page1.evaluate(() => window.api.settings.getAll())).toMatchObject({ theme: 'light', showStatusBar: false })

  await first.close()

  // ── 2 回目: 切り替えた状態で開くはず ──
  const second = await electron.launch({ args: ['out/main/index.js'], env })
  const page2 = await second.firstWindow()
  await page2.waitForSelector('.titlebar')

  await expect(page2.getByRole('combobox', { name: 'テーマ' })).toHaveValue('light')
  await expect(page2.getByRole('switch', { name: 'ステータスバーを表示' })).toHaveAttribute('aria-checked', 'false')
  await expect(page2.locator('.statusbar')).toHaveCount(0)

  await second.close()
  try {
    rmSync(userDataDir, { recursive: true, force: true })
  } catch {
    // 掴まれたままなら残る。一時フォルダなので放っておいてよい
  }
})
