import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from './helpers'

/**
 * 描画に失敗したときの受け止めを確かめる。
 *
 * これが無いと React は失敗した枝を丸ごと外し、**画面が真っ白になる**。
 * 利用者からは「壊れた」としか見えず、何をすればよいか分からない。
 * 作っただけで確かめないと、いざ必要な時に働かない類の仕掛けなので試す。
 */
test.describe('描画の失敗', () => {
  let ctx: Launched

  test.beforeAll(async () => {
    ctx = await launchApp()
  })

  test.afterAll(async () => {
    await ctx?.close()
  })

  test('真っ白にならず、案内と復帰手段が出る', async () => {
    const { page } = ctx

    await page.getByRole('button', { name: '描画を壊す（確認用）' }).click()

    // 何が起きたのかが分かること
    await expect(page.locator('.crash__title')).toHaveText('画面の表示に失敗した')
    // 原因の手掛かりが出ていること
    await expect(page.locator('.crash__detail')).toContainText('わざと描画に失敗させた')
    // 戻る手段があること
    await expect(page.getByRole('button', { name: 'もう一度描画する' })).toBeVisible()
    await expect(page.getByRole('button', { name: '記録を開く' })).toBeVisible()
  })

  test('「もう一度描画する」で元の画面に戻る', async () => {
    const { page } = ctx

    await page.getByRole('button', { name: 'もう一度描画する' }).click()

    await expect(page.locator('.crash__title')).toBeHidden()
    await expect(page.getByText('設定を読み込み済み')).toBeVisible()
  })
})
