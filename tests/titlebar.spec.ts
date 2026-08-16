import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from './helpers'

/**
 * タイトルバーのドラッグ領域（`src/renderer/src/ui/TitleBar.tsx`）。
 *
 * 【なぜ検査するのか】
 *   `-webkit-app-region` は**間違えても画面の見た目は一切変わらない**。
 *   気づけるのは「窓を掴んで動かそうとしたら動かない」時だけで、
 *   しかも「たまたま掴んだ場所が悪かった」と誤解しやすい。
 *
 *   実際、入れ物（`.titlebar__slot`）ごと `no-drag` にしたうえで `flex: 1` で
 *   伸ばしていたため、**バーの中央 20〜80% が丸ごと死んでいた**（実測）。
 */
test.describe('タイトルバー', () => {
  let ctx: Launched

  test.beforeAll(async () => {
    ctx = await launchApp()
  })

  test.afterAll(async () => {
    await ctx?.close()
  })

  /** その横位置がドラッグできるか（先祖に no-drag がいないか）を見る */
  function draggableAt(ratio: number): Promise<{ draggable: boolean; cls: string }> {
    return ctx.page.evaluate((r) => {
      const bar = document.querySelector('.titlebar') as HTMLElement
      const box = bar.getBoundingClientRect()
      const el = document.elementFromPoint(
        box.left + box.width * r,
        box.top + box.height / 2
      ) as HTMLElement | null

      // no-drag は矩形ごとドラッグ領域から引かれる。先祖まで遡って見る
      let node: HTMLElement | null = el
      while (node) {
        if (getComputedStyle(node).getPropertyValue('-webkit-app-region') === 'no-drag') {
          return { draggable: false, cls: node.className }
        }
        node = node.parentElement
      }
      return { draggable: true, cls: el?.className ?? '(なし)' }
    }, ratio)
  }

  test('中央付近を掴んで窓を動かせる', async () => {
    // ここが死ぬと、ドラッグもダブルクリックでの最大化も効かなくなる
    for (const ratio of [0.3, 0.4, 0.5, 0.6, 0.7]) {
      const at = await draggableAt(ratio)
      expect(at.draggable, `x=${ratio * 100}% が ${at.cls} で塞がれている`).toBe(true)
    }
  })

  test('窓ボタンの上は掴めない（押せる必要があるため）', async () => {
    const at = await draggableAt(0.97)
    expect(at.draggable).toBe(false)
  })

  test('版表記は押せる（no-drag が効いている）', async () => {
    const { page } = ctx
    await page.locator('.version__label').click()
    await expect(page.locator('.changelog')).toBeVisible()
    await page.locator('dialog.dialog').getByRole('button', { name: '閉じる' }).click()
  })

  test('コンソールにエラーが出ていない', async () => {
    expect(ctx.consoleErrors).toEqual([])
  })
})
