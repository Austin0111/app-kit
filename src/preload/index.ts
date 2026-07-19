import { contextBridge, ipcRenderer } from 'electron'

// 生のチャンネル名は renderer に晒さない（CommandDeck の preload と同じ原則）。
const api = {
  settings: {
    getAll: (defaults: Record<string, string>): Promise<Record<string, string>> =>
      ipcRenderer.invoke('settings:getAll', defaults),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value)
  },
  notes: {
    list: (): Promise<{ id: number; body: string; createdAt: string }[]> =>
      ipcRenderer.invoke('notes:list'),
    add: (body: string): Promise<void> => ipcRenderer.invoke('notes:add', body),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('notes:remove', id)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
