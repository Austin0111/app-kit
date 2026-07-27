import type { BrowserWindow } from 'electron'

/**
 * 破棄済み（かもしれない）ウィンドウへの push を安全に行う。
 *
 * 【なぜ要るか】映棚（videodeck）で実際に踏んだ罠: `mainWindow` のような
 * モジュール変数を持つ設計だと、ウィンドウが閉じた後も変数自体は
 * null に戻らず「非 null だが破棄済み」のオブジェクトを指したままになる。
 * `win?.webContents.send(...)` の `?.` は変数が null/undefined の時しか
 * 守ってくれず、「非nullだが破棄済み」には無力（実測で
 * `TypeError: Object has been destroyed` を確認済み）。
 *
 * この雛形は `BrowserWindow.fromWebContents()` / `getAllWindows()` を
 * 都度取り直す設計なので上記の罠そのものは踏みにくいが、`isDestroyed()`の
 * チェック自体は呼び出し側それぞれが個別に書いており、今後 push を足す
 * 場所が増えるたびに書き忘れるリスクは残る。ここに集約しておく。
 */
export function safeSend(
  win: BrowserWindow | null | undefined,
  channel: string,
  ...args: unknown[]
): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}
