import { expect, test } from '@playwright/test'
import { launchApp } from './helpers'

// Replace only this test app's main-process handler. launchApp uses temporary userData.
// Restoring the handler allows the same window to prove recovery without touching a real profile.
async function setInvokeFailure(app: Awaited<ReturnType<typeof launchApp>>['app'], channel: string, fail: boolean): Promise<void> {
  await app.evaluate(({ ipcMain }, { channel, fail }) => {
    const handlers = (ipcMain as typeof ipcMain & { _invokeHandlers: Map<string, (...args: unknown[]) => unknown> })._invokeHandlers
    const state = globalThis as typeof globalThis & { __settingsFailureOriginals?: Map<string, (...args: unknown[]) => unknown> }
    state.__settingsFailureOriginals ??= new Map()
    if (fail) {
      const original = handlers.get(channel)
      if (!original) throw new Error(`Missing IPC handler: ${channel}`)
      state.__settingsFailureOriginals.set(channel, original)
      handlers.set(channel, () => { throw new Error('isolated settings failure test') })
    } else {
      const original = state.__settingsFailureOriginals.get(channel)
      if (!original) throw new Error(`Missing saved IPC handler: ${channel}`)
      handlers.set(channel, original)
      state.__settingsFailureOriginals.delete(channel)
    }
  }, { channel, fail })
}

test('設定保存失敗は値を戻し、読み上げと再試行経路を保つ', async () => {
  const ctx = await launchApp()
  try {
    const { page } = ctx
    const theme = page.getByRole('combobox', { name: 'テーマ' })
    await expect(theme).toHaveValue('dark')
    await setInvokeFailure(ctx.app, 'settings:setMany', true)

    await theme.selectOption('light')
    const alert = page.getByRole('alert').filter({ hasText: '設定を保存できませんでした' })
    await expect(alert).toBeVisible()
    await expect(theme).toHaveValue('dark')
    await expect.poll(() => page.evaluate(() => window.api.settings.getAll())).toMatchObject({ theme: 'dark' })
    const retry = alert.getByRole('button', { name: '再読込' })
    await retry.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(retry).toBeFocused()
    expect(await retry.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')

    await setInvokeFailure(ctx.app, 'settings:setMany', false)
    await retry.press('Enter')
    await expect(alert).toHaveCount(0)
    await theme.selectOption('light')
    await expect.poll(() => page.evaluate(() => window.api.settings.getAll())).toMatchObject({ theme: 'light' })
    expect(ctx.consoleErrors).toEqual([])
  } finally {
    await ctx.close()
  }
})

test('APIキー状態の取得失敗は再確認で復帰し、秘密値を作らない', async () => {
  const ctx = await launchApp()
  try {
    const { page } = ctx
    await expect(page.getByRole('status').filter({ hasText: '状態: 未設定' })).toBeVisible()
    await setInvokeFailure(ctx.app, 'secrets:status', true)
    await page.reload()
    const alert = page.getByRole('alert').filter({ hasText: '状態を確認できませんでした' })
    await expect(alert).toBeVisible()
    const retry = page.getByRole('button', { name: '状態を再確認' })
    await expect(retry).toBeEnabled()
    await retry.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(retry).toBeFocused()
    expect(await retry.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')

    await setInvokeFailure(ctx.app, 'secrets:status', false)
    await retry.press('Enter')
    await expect(alert).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: '状態: 未設定' })).toBeVisible()
    await expect(page.getByRole('button', { name: '設定する' })).toBeEnabled()
    await expect(page.getByRole('button', { name: '消す' })).toHaveCount(0)
    expect(ctx.consoleErrors).toEqual([])
  } finally {
    await ctx.close()
  }
})
