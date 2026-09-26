import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from './helpers'

test.describe('UI 部品', () => {
  let ctx: Launched

  test.beforeAll(async () => {
    ctx = await launchApp()
  })

  test.afterAll(async () => {
    await ctx?.close()
  })

  test('タイトルバーの最大化ボタンで表示が入れ替わる', async () => {
    const button = ctx.page.locator('.titlebar__button').nth(1)
    await expect(button).toHaveAttribute('aria-label', '最大化')

    await button.click()
    await expect(button).toHaveAttribute('aria-label', '元のサイズに戻す')

    await button.click()
    await expect(button).toHaveAttribute('aria-label', '最大化')
  })

  test('notes入力は標準TextFieldの説明とキーボード操作を保つ', async () => {
    const { page } = ctx
    const input = page.getByRole('textbox', { name: 'メモの内容' })
    const emptyNotes = page.getByRole('status').filter({ hasText: 'まだメモがありません' })
    await expect(emptyNotes).toBeVisible()
    const descriptionId = await input.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    await expect(page.locator(`[id="${descriptionId}"]`)).toHaveText('Enterキーでも追加できます')
    await input.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(input).toBeFocused()
    expect(await input.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
    await input.fill('標準入力の確認')
    await input.press('Enter')
    await expect(input).toHaveValue('')
    await expect(page.getByText('標準入力の確認')).toBeVisible()
    await expect(emptyNotes).toHaveCount(0)
    await page.getByRole('button', { name: '×' }).first().click()
    await page.getByRole('button', { name: '削除' }).click()
    await expect(page.getByText('標準入力の確認')).toBeHidden()
    await expect(emptyNotes).toBeVisible()
    await page.locator('.toast--success').click()
    await expect(page.locator('.toast--success')).toHaveCount(0)
  })

  test('確認ダイアログ: やめるを押すと何も起きない', async () => {
    const { page } = ctx

    await page.getByPlaceholder('何か書いて Enter').fill('消さない項目')
    await page.getByRole('button', { name: '追加' }).click()
    await expect(page.getByText('消さない項目')).toBeVisible()

    await page.getByRole('button', { name: '×' }).first().click()
    await expect(page.locator('dialog.dialog')).toBeVisible()
    await page.getByRole('button', { name: 'やめる' }).click()

    await expect(page.locator('dialog.dialog')).toBeHidden()
    await expect(page.getByText('消さない項目')).toBeVisible()
  })

  test('確認ダイアログ: 削除を押すと消えてトーストが出る', async () => {
    const { page } = ctx

    await page.getByRole('button', { name: '×' }).first().click()
    await page.getByRole('button', { name: '削除' }).click()

    await expect(page.getByText('消さない項目')).toBeHidden()
    await expect(page.locator('.toast--success')).toBeVisible()
  })

  test('Esc でダイアログが閉じる', async () => {
    const { page } = ctx

    await page.getByPlaceholder('何か書いて Enter').fill('Esc の確認')
    await page.getByRole('button', { name: '追加' }).click()
    await page.getByRole('button', { name: '編集' }).first().click()

    await expect(page.locator('dialog.dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    // React 18 は <dialog> の cancel を合成イベント化しないため、
    // ネイティブに addEventListener している。ここが壊れると Esc が効かなくなる
    await expect(page.locator('dialog.dialog')).toBeHidden()
  })

  test('秘密情報は状態だけが出て、値を読む口が無い', async () => {
    const { page } = ctx

    await expect(page.getByText('状態: 未設定')).toBeVisible()

    // レンダラーに get が生えていないこと自体を確かめる
    const hasGetter = await page.evaluate(
      () => 'get' in ((window as unknown as { api: { secrets: object } }).api.secrets as object)
    )
    expect(hasGetter).toBe(false)
  })

  /**
   * 固定配置の要素が内容を覆っていないかを見る。
   * 見た目の崩れの中でも**これは機械で判定できる**（座標で比べられるため）。
   * 実際、狭い幅でステータスバーが最後の要素に被っていたのをここで拾えるようにした。
   */
  test('一番下までスクロールしても内容がステータスバーに隠れない', async () => {
    const { page } = ctx
    await page.setViewportSize({ width: 640, height: 620 })
    await page.waitForTimeout(200)

    await page.locator('.app').evaluate((app) => {
      app.scrollTop = app.scrollHeight
    })
    await page.waitForTimeout(200)

    const overlap = await page.evaluate(() => {
      const bar = document.querySelector('.statusbar')
      const sections = [...document.querySelectorAll('.app section')]
      const last = sections[sections.length - 1]
      if (!bar || !last) return null
      const barTop = bar.getBoundingClientRect().top
      const lastBottom = last.getBoundingClientRect().bottom
      return { barTop, lastBottom, hidden: lastBottom > barTop }
    })

    expect(overlap).not.toBeNull()
    expect(overlap!.hidden).toBe(false)
  })

  /**
   * メニューバーを消すと標準ショートカットが道連れになる恐れがあるため確かめる。
   * 入力欄での編集操作が効かなくなるのは致命的なので、ここは見張っておく。
   */
  test('メニューを消しても入力欄の編集操作が効く', async () => {
    const { page } = ctx
    const input = page.getByPlaceholder('何か書いて Enter')

    await input.fill('最初の文字列')
    await input.press('Control+a')
    await input.type('置き換えた')
    // 全選択が効いていれば、追記ではなく置換になる
    await expect(input).toHaveValue('置き換えた')

    await input.press('Control+a')
    await input.press('Backspace')
    await expect(input).toHaveValue('')
  })

  test('メニューバーが出ていない', async () => {
    const hasMenu = await ctx.app.evaluate(({ Menu }) => Menu.getApplicationMenu() !== null)
    expect(hasMenu).toBe(false)
  })

  test('コンソールにエラーが出ていない', async () => {
    expect(ctx.consoleErrors).toEqual([])
  })
})
