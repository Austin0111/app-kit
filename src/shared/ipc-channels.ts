/**
 * preload と main が共有する IPC 契約。
 * チャンネル名の直書きを禁止し、公開APIとhandlerの取りこぼしをテスト可能にする。
 */
export const IPC_CHANNELS = {
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggleMaximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:isMaximized',
  settingsGetAll: 'settings:getAll',
  settingsSetMany: 'settings:setMany',
  secretsSet: 'secrets:set',
  secretsClear: 'secrets:clear',
  secretsStatus: 'secrets:status',
  appVersion: 'app:version',
  appCheckUpdate: 'app:checkUpdate',
  appOpenReleases: 'app:openReleases',
  appChangelog: 'app:changelog',
  logWrite: 'log:write',
  logOpenFolder: 'log:openFolder',
  backupCreate: 'backup:create',
  backupList: 'backup:list',
  backupRestore: 'backup:restore',
  backupOpenFolder: 'backup:openFolder',
  notesList: 'notes:list',
  notesAdd: 'notes:add',
  notesUpdate: 'notes:update',
  notesRemove: 'notes:remove',
  e2eSafeSendOnDestroyedWindow: 'e2e:safeSendOnDestroyedWindow',
  e2eRegisteredIpcChannels: 'e2e:registeredIpcChannels',
  e2eSimulateElectronFailure: 'e2e:simulateElectronFailure'
} as const

export const IPC_SEND_CHANNELS = {
  windowMaximizedChanged: 'window:maximizedChanged',
  settingsChanged: 'settings:changed'
} as const

export const ALL_INVOKE_CHANNELS = Object.values(IPC_CHANNELS)
