import {
  BrowserWindow,
  ipcMain,
  type IpcMainInvokeEvent,
  type WebContents
} from 'electron'

const registeredChannels = new Set<string>()

/**
 * renderer から main へ入る境界の共通防御。
 * iframe や所有者不明の webContents から、特権 IPC を呼ばせない。
 */
export function trustedSenderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const frame = event.senderFrame
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!frame || frame !== event.sender.mainFrame || !win || win.isDestroyed()) {
    throw new Error('信頼できない画面からの操作を拒否した')
  }
  return win
}

export function handleTrusted<T extends unknown[]>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: T) => unknown
): void {
  ipcMain.handle(channel, (event, ...args) => {
    trustedSenderWindow(event)
    return listener(event, ...(args as T))
  })
  registeredChannels.add(channel)
}

/** E2Eの契約検査用。外へ返す配列は複製して登録順への依存を避ける。 */
export function registeredIpcChannels(): string[] {
  return [...registeredChannels].sort()
}

/** 任意の遷移と子画面を拒否。明示された同一URLへの遷移だけ許可する。 */
export function lockDownWebContents(contents: WebContents, allowedUrl?: string): void {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (event, url) => {
    if (url !== allowedUrl) event.preventDefault()
  })
  contents.on('will-redirect', (event) => event.preventDefault())

  const ses = contents.session
  ses.setPermissionCheckHandler(() => false)
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
}
