import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Settings } from '../shared/settings'
import type { LogContext, LogLevel } from '../shared/log-types'
import type { SecretStatus } from '../main/secrets'
import type { UpdateInfo } from '../main/update-check'
import { IPC_CHANNELS, IPC_SEND_CHANNELS } from '../shared/ipc-channels'

// 生のチャンネル名は renderer に晒さない（CommandDeck の preload と同じ原則）。
const api = {
  /**
   * 自動テストで動いているか。**検証用の仕掛けを出す判定にだけ使う。**
   * preload は Node の環境変数を読めるので、同期で渡せる（描画時に await できないため）。
   * 配布版では常に false になる。
   */
  isE2E: process.env.APP_E2E === '1',
  /**
   * E2E検証専用のフック（`tests/ipc-safe.spec.ts`）。main側のハンドラは
   * APP_E2E=1 の時しか登録されないため、配布版で呼んでも失敗するだけで無害。
   */
  e2e: {
    safeSendOnDestroyedWindow: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.e2eSafeSendOnDestroyedWindow),
    registeredIpcChannels: (): Promise<string[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.e2eRegisteredIpcChannels),
    simulateElectronFailure: (
      kind: 'renderer' | 'child' | 'unresponsive' | 'load'
    ): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.e2eSimulateElectronFailure, kind)
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
    close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized),
    /** ボタン以外での最大化（スナップ・ダブルクリック・Win+↑）も拾うための購読 */
    onMaximizedChange: (cb: (maximized: boolean) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, v: boolean): void => cb(v)
      ipcRenderer.on(IPC_SEND_CHANNELS.windowMaximizedChanged, listener)
      return () => ipcRenderer.off(IPC_SEND_CHANNELS.windowMaximizedChanged, listener)
    }
  },
  settings: {
    getAll: (): Promise<Settings> => ipcRenderer.invoke(IPC_CHANNELS.settingsGetAll),
    setMany: (patch: Partial<Settings>): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSetMany, patch),
    /** 他の窓や main 側で設定が変わった時に呼ばれる。戻り値で購読解除する。 */
    onChange: (cb: (patch: Partial<Settings>) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, patch: Partial<Settings>): void => cb(patch)
      ipcRenderer.on(IPC_SEND_CHANNELS.settingsChanged, listener)
      return () => ipcRenderer.off(IPC_SEND_CHANNELS.settingsChanged, listener)
    }
  },
  /**
   * 秘密情報（APIキー等）。
   * **値を読み出す口は敢えて無い。** 平文をレンダラーへ持ち込まないため。
   * 秘密を使う処理は main 側に置くこと。
   */
  secrets: {
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.secretsSet, key, value),
    clear: (key: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.secretsClear, key),
    status: (key: string): Promise<SecretStatus> => ipcRenderer.invoke(IPC_CHANNELS.secretsStatus, key)
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.appVersion),
    /** 更新確認。通知のみで、ダウンロードはブラウザに委ねる */
    checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke(IPC_CHANNELS.appCheckUpdate),
    openReleases: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.appOpenReleases),
    changelog: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.appChangelog)
  },
  log: {
    write: (level: LogLevel, message: string, context?: LogContext): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.logWrite, level, message, context),
    openFolder: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.logOpenFolder)
  },
  backup: {
    create: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.backupCreate),
    list: (): Promise<
      { path: string; name: string; size: number; createdAt: string }[]
    > => ipcRenderer.invoke(IPC_CHANNELS.backupList),
    restore: (path: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.backupRestore, path),
    openFolder: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.backupOpenFolder)
  },
  notes: {
    list: (): Promise<{ id: number; body: string; createdAt: string; done: boolean }[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.notesList),
    add: (body: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.notesAdd, body),
    update: (id: number, body: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.notesUpdate, id, body),
    remove: (id: number): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.notesRemove, id)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
