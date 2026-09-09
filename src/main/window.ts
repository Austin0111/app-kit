import { BrowserWindow } from 'electron'
import { safeSend } from './ipc-safe'
import { handleTrusted, trustedSenderWindow } from './security'
import { IPC_CHANNELS, IPC_SEND_CHANNELS } from '../shared/ipc-channels'

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
  minimize: IPC_CHANNELS.windowMinimize,
  toggleMaximize: IPC_CHANNELS.windowToggleMaximize,
  close: IPC_CHANNELS.windowClose,
  isMaximized: IPC_CHANNELS.windowIsMaximized,
  /** main → renderer。最大化状態が変わったら送る */
  maximizedChanged: IPC_SEND_CHANNELS.windowMaximizedChanged
} as const

/** 送り主のウィンドウを取り出す（複数窓でも取り違えないように） */
export function registerWindowHandlers(): void {
  handleTrusted(WINDOW_CHANNELS.minimize, (e) => trustedSenderWindow(e).minimize())

  handleTrusted(WINDOW_CHANNELS.toggleMaximize, (e) => {
    const win = trustedSenderWindow(e)
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })

  handleTrusted(WINDOW_CHANNELS.close, (e) => trustedSenderWindow(e).close())

  handleTrusted(WINDOW_CHANNELS.isMaximized, (e) => trustedSenderWindow(e).isMaximized())
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
