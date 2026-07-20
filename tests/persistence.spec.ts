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

  // ── 1 回目: テーマを切り替える ──
  const first = await electron.launch({ args: ['out/main/index.js'], env })
  const page1 = await first.firstWindow()
  await page1.waitForSelector('.titlebar')

  await expect(page1.getByRole('button', { name: /テーマ: dark/ })).toBeVisible()
  await page1.getByRole('button', { name: /テーマ:/ }).click()
  await expect(page1.getByRole('button', { name: /テーマ: light/ })).toBeVisible()

  await first.close()

  // ── 2 回目: 切り替えた状態で開くはず ──
  const second = await electron.launch({ args: ['out/main/index.js'], env })
  const page2 = await second.firstWindow()
  await page2.waitForSelector('.titlebar')

  await expect(page2.getByRole('button', { name: /テーマ: light/ })).toBeVisible()

  await second.close()
  try {
    rmSync(userDataDir, { recursive: true, force: true })
  } catch {
    // 掴まれたままなら残る。一時フォルダなので放っておいてよい
  }
})
