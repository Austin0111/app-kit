import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Settings } from '../shared/settings'

// 生のチャンネル名は renderer に晒さない（CommandDeck の preload と同じ原則）。
const api = {
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
