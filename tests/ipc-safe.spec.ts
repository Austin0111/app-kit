import { expect, test } from '@playwright/test'
import { launchApp, type Launched } from './helpers'

/**
 * 破棄済みウィンドウへ push しても main プロセスが落ちないことを確かめる。
 *
 * 【何を再現しているか】映棚（videodeck）で実際に踏んだ罠: ウィンドウが閉じた後、
 * 完了が遅れた非同期処理（外部コマンド・fetch等）が `webContents.send()` を
 * 呼ぼうとすると `TypeError: Object has been destroyed` を投げる。
 * `src/main/ipc-safe.ts` の `safeSend()` はこれを防ぐためのヘルパーだが、
 * 作っただけで確かめないと、いざ必要な時に働かない類の仕掛けなので試す。
 *
 * 実際にメインウィンドウを閉じてタイミングを合わせるのは再現性が低いため、
 * main側にE2E専用のIPC（`e2e:safeSendOnDestroyedWindow`）を用意し、
 * 「隠しウィンドウを作って即座に破棄し、そこへ safeSend() で送る」を
 * 決定的に再現する。
 */
test.describe('破棄済みウィンドウへの安全な送信', () => {
  let ctx: Launched

  test.beforeAll(async () => {
    ctx = await launchApp()
  })

  test.afterAll(async () => {
    await ctx?.close()
  })

  test('例外を投げずに戻り、アプリも生きたまま', async () => {
    const { app, page } = ctx

    const result = await page.evaluate(() => window.api.e2e.safeSendOnDestroyedWindow())
    expect(result).toBe(true)

    // main プロセスが例外で落ちていないことも確認しておく（サイレントに例外を
    // 握りつぶしただけで実は死んでいた、という誤判定を避けるため）。
    const stillAlive = await app.evaluate(({ app }) => app.isReady())
    expect(stillAlive).toBe(true)
  })
})
