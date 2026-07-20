import { test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { launchApp, type Launched } from './helpers'

/**
 * 目視確認用のスクリーンショットを撮る。
 *
 * **これは合否を判定しない。** 画面の崩れ（文字切れ・はみ出し・余白・アイコン欠け）は
 * 機械的な判定に向かず、無理に自動化すると「通っているのに崩れている」か
 * 「崩れていないのに落ちる」のどちらかになる。
 * ここでは素材を出すところまでを担い、**判断は人（と目で見る AI）に渡す**。
 *
 * 幅を変えて撮るのは、1 つの幅だけ見ても崩れが出ないため。
 */

const SIZES = [
  { name: 'narrow', width: 640, height: 720 },
  { name: 'normal', width: 1000, height: 760 },
  { name: 'wide', width: 1440, height: 900 }
]

const OUT_DIR = join('test-results', 'screenshots')

test('各画面幅のスクリーンショットを撮る', async () => {
  mkdirSync(OUT_DIR, { recursive: true })
  let ctx: Launched | undefined

  try {
    ctx = await launchApp()

    for (const size of SIZES) {
      await ctx.page.setViewportSize({ width: size.width, height: size.height })
      // レイアウトが落ち着くのを待つ
      await ctx.page.waitForTimeout(250)
      await ctx.page.screenshot({
        path: join(OUT_DIR, `${size.name}-${size.width}x${size.height}.png`),
        fullPage: false
      })
    }

    // ダイアログが開いている状態も撮る（重なりの確認用）
    await ctx.page.getByPlaceholder('何か書いて Enter').fill('見た目の確認用')
    await ctx.page.getByRole('button', { name: '追加' }).click()
    await ctx.page.getByRole('button', { name: '編集' }).first().click()
    await ctx.page.waitForSelector('dialog.dialog')
    await ctx.page.screenshot({ path: join(OUT_DIR, 'dialog.png') })
  } finally {
    await ctx?.close()
  }
})
