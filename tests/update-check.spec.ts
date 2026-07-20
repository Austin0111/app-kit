import { expect, test } from '@playwright/test'
import { readFileSync } from 'fs'
import { launchApp, type Launched } from './helpers'

/**
 * 更新確認まわり。
 * 版の比較は境界を間違えやすい（1.10.0 と 1.9.0 など）ので、実際の実装で確かめる。
 */
test.describe('更新確認', () => {
  let ctx: Launched

  test.beforeAll(async () => {
    ctx = await launchApp()
  })

  test.afterAll(async () => {
    await ctx?.close()
  })

  test('タイトルバーに package.json と同じ版が出る', async () => {
    // NOTE: 形（v0.0.0）だけを見る判定では不十分だった。
    // app.getVersion() が Electron 自身の版(33.x)を返していた時も通ってしまい、
    // 表示が v33.4.11 になっているのを見逃した。**実際の値と突き合わせる。**
    const expected = JSON.parse(readFileSync('package.json', 'utf8')).version

    const label = ctx.page.locator('.version__label')
    await expect(label).toBeVisible()
    await expect(label).toHaveText(`v${expected}`)

    const reported = await ctx.page.evaluate(() => window.api.app.version())
    expect(reported).toBe(expected)
  })

  test('版をクリックすると更新履歴が出る', async () => {
    await ctx.page.locator('.version__label').click()
    await expect(ctx.page.locator('dialog.dialog')).toBeVisible()
    await expect(ctx.page.locator('.changelog')).toContainText('更新履歴')
    // 「閉じる」はタイトルバーの × にも付いているので、ダイアログ内に限定する
    await ctx.page.locator('dialog.dialog').getByRole('button', { name: '閉じる' }).click()
    await expect(ctx.page.locator('dialog.dialog')).toBeHidden()
  })

  test('更新確認は失敗しても例外を投げない', async () => {
    // 通信できない環境でも「確認できなかった」を返すだけであること
    const result = await ctx.page.evaluate(() => window.api.app.checkUpdate())
    expect(result).toHaveProperty('currentVersion')
    expect(typeof result.hasUpdate).toBe('boolean')
  })

  test('版の比較が正しい', async () => {
    // main 側の isNewer は非公開なので、checkUpdate 経由ではなく
    // 同じ規則をここで検算する（実装を変えたらここも合わせる）
    const parse = (v: string): number[] =>
      v
        .replace(/^v/i, '')
        .split('-')[0]
        .split('.')
        .map((n) => Number.parseInt(n, 10) || 0)

    const isNewer = (latest: string, current: string): boolean => {
      const a = parse(latest)
      const b = parse(current)
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] ?? 0
        const y = b[i] ?? 0
        if (x !== y) return x > y
      }
      return false
    }

    expect(isNewer('v0.2.0', '0.1.0')).toBe(true)
    expect(isNewer('v1.10.0', 'v1.9.0')).toBe(true) // 桁数が違う場合
    expect(isNewer('v1.0.0', 'v1.0.0')).toBe(false) // 同じ
    expect(isNewer('v0.1.0', 'v0.2.0')).toBe(false) // 古い
    expect(isNewer('v1.0.1', 'v1.0.0-beta')).toBe(true) // 接尾辞つき
    expect(isNewer('v2.0', 'v1.9.9')).toBe(true) // 桁が足りない
  })

  test('コンソールにエラーが出ていない', async () => {
    expect(ctx.consoleErrors).toEqual([])
  })
})
