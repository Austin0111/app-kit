import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Settings } from '../shared/settings'
import type { LogContext, LogLevel } from '../shared/log-types'
import type { SecretStatus } from '../main/secrets'
import type { UpdateInfo } from '../main/update-check'

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
      ipcRenderer.invoke('e2e:safeSendOnDestroyedWindow')
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    /** ボタン以外での最大化（スナップ・ダブルクリック・Win+↑）も拾うための購読 */
    onMaximizedChange: (cb: (maximized: boolean) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, v: boolean): void => cb(v)
      ipcRenderer.on('window:maximizedChanged', listener)
      return () => ipcRenderer.off('window:maximizedChanged', listener)
    }
  },
  settings: {
    getAll: (): Promise<Settings> => ipcRenderer.invoke('settings:getAll'),
    setMany: (patch: Partial<Settings>): Promise<void> =>
      ipcRenderer.invoke('settings:setMany', patch),
    /** 他の窓や main 側で設定が変わった時に呼ばれる。戻り値で購読解除する。 */
    onChange: (cb: (patch: Partial<Settings>) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, patch: Partial<Settings>): void => cb(patch)
      ipcRenderer.on('settings:changed', listener)
      return () => ipcRenderer.off('settings:changed', listener)
    }
  },
  /**
   * 秘密情報（APIキー等）。
   * **値を読み出す口は敢えて無い。** 平文をレンダラーへ持ち込まないため。
   * 秘密を使う処理は main 側に置くこと。
   */
  secrets: {
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('secrets:set', key, value),
    clear: (key: string): Promise<void> => ipcRenderer.invoke('secrets:clear', key),
    status: (key: string): Promise<SecretStatus> => ipcRenderer.invoke('secrets:status', key)
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    /** 更新確認。通知のみで、ダウンロードはブラウザに委ねる */
    checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke('app:checkUpdate'),
    openReleases: (): Promise<void> => ipcRenderer.invoke('app:openReleases'),
    changelog: (): Promise<string | null> => ipcRenderer.invoke('app:changelog')
  },
  log: {
    write: (level: LogLevel, message: string, context?: LogContext): Promise<void> =>
      ipcRenderer.invoke('log:write', level, message, context),
    openFolder: (): Promise<string> => ipcRenderer.invoke('log:openFolder')
  },
  backup: {
    create: (): Promise<string> => ipcRenderer.invoke('backup:create'),
    list: (): Promise<
      { path: string; name: string; size: number; createdAt: string }[]
    > => ipcRenderer.invoke('backup:list'),
    restore: (path: string): Promise<boolean> => ipcRenderer.invoke('backup:restore', path),
    openFolder: (): Promise<string> => ipcRenderer.invoke('backup:openFolder')
  },
  notes: {
    list: (): Promise<{ id: number; body: string; createdAt: string; done: boolean }[]> =>
      ipcRenderer.invoke('notes:list'),
    add: (body: string): Promise<void> => ipcRenderer.invoke('notes:add', body),
    update: (id: number, body: string): Promise<void> =>
      ipcRenderer.invoke('notes:update', id, body),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('notes:remove', id)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
