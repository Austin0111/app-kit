import { BrowserWindow, ipcMain } from 'electron'
import { safeSend } from './ipc-safe'

/**
 * カスタムタイトルバーのための窓制御。
 *
 * 棚卸しで My棚 / 映棚 / CharaLauncher（＋WPF の Oto棚が ChromeWindow 基底クラス）が
 * それぞれ独立に同じものを書いていた。スタックを越えて同じ判断に到達している。
 *
 * 【frame:false ＋ titleBarStyle:'hidden'】
 *   frame:false だけでも枠は消えるが、titleBarStyle:'hidden' を併記しておくと
 *   将来 macOS 対応する時に信号機ボタンの扱いを足しやすい（映棚と同じ指定）。
 */

export const WINDOW_CHANNELS = {
  minimize: 'window:minimize',
  toggleMaximize: 'window:toggleMaximize',
  close: 'window:close',
  isMaximized: 'window:isMaximized',
  /** main → renderer。最大化状態が変わったら送る */
  maximizedChanged: 'window:maximizedChanged'
} as const

/** 送り主のウィンドウを取り出す（複数窓でも取り違えないように） */
function senderWindow(e: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender)
}

export function registerWindowHandlers(): void {
  ipcMain.handle(WINDOW_CHANNELS.minimize, (e) => senderWindow(e)?.minimize())

  ipcMain.handle(WINDOW_CHANNELS.toggleMaximize, (e) => {
    const win = senderWindow(e)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })

  ipcMain.handle(WINDOW_CHANNELS.close, (e) => senderWindow(e)?.close())

  ipcMain.handle(WINDOW_CHANNELS.isMaximized, (e) => !!senderWindow(e)?.isMaximized())
}

/**
 * 最大化状態の変化を renderer へ push する。
 *
 * 【なぜ push が要るか】
 *   最大化はボタン以外でも起きる（画面端へのスナップ、タイトルバーのダブルクリック、
 *   Win+↑）。renderer 側がボタン押下時にしか状態を更新しないと、
 *   **アイコンが実際の状態とズレる**。取りこぼしを無くすには main から通知するしかない。
 */
export function watchMaximizeState(win: BrowserWindow): void {
  const send = (): void => {
    if (win.isDestroyed()) return
    safeSend(win, WINDOW_CHANNELS.maximizedChanged, win.isMaximized())
  }
  win.on('maximize', send)
  win.on('unmaximize', send)
  // フルスクリーン経由でも見た目が変わるので拾う
  win.on('enter-full-screen', send)
  win.on('leave-full-screen', send)
}
