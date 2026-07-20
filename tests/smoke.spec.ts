import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from './helpers'

/**
 * 起動して最低限が揃っているかを見る。
 * ここが落ちる時は他のテストも意味を成さないので、まずこれを通す。
 */
test.describe('起動', () => {
  let ctx: Launched

  test.beforeAll(async () => {
    ctx = await launchApp()
  })

  test.afterAll(async () => {
    await ctx?.close()
  })

  test('ウィンドウが開き、主要な部品が描かれる', async () => {
    await expect(ctx.page.locator('.titlebar')).toBeVisible()
    await expect(ctx.page.locator('h1')).toBeVisible()
    // 設定を読めていれば「読み込み済み」に変わる
    await expect(ctx.page.getByText('設定を読み込み済み')).toBeVisible()
  })

  test('コンソールにエラーが出ていない', async () => {
    expect(ctx.consoleErrors).toEqual([])
  })
})
