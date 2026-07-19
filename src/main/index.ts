import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { APP_ID, DISPLAY_NAME, INTERNAL_NAME } from '../shared/app-meta'
import { eq } from 'drizzle-orm'
import { createDb } from './db'
import { notes } from './db/schema'
import { installCrashLog } from './crash-log'
import { SettingsStore } from './settings'
import { BackupService, backupDir } from './backup'
import { registerWindowHandlers, watchMaximizeState } from './window'
import { log, logFromRenderer, logsDir, setDebugLogging } from './log'
import type { Settings } from '../shared/settings'
import type { LogContext, LogLevel } from '../shared/log-types'

// 未処理例外の安全網は「何よりも先に」入れる（Oto棚の作法）。
// ここより前で落ちると原因が残らないため、DB を開くより前に仕掛ける。
installCrashLog()

// ── 保存先の固定（**userData を触る処理より前に実行すること**）──
// 既定の userData は package.json の name / productName から派生するため、
// 表示名を変えたり配布形態が変わったりすると保存先が動き、
// 設定・DB・バックアップが行方不明になる。内部識別子に明示的に固定して防ぐ。
// （PixNest が同じ対策を採っている）
app.setName(INTERNAL_NAME)
app.setPath('userData', join(app.getPath('appData'), INTERNAL_NAME))
// タスクバーのグループ化・通知の識別子。インストーラ側の設定と一致させること。
app.setAppUserModelId(APP_ID)

let store: ReturnType<typeof createDb>
let settings: SettingsStore
let backup: BackupService

function createWindow(): void {
  const bounds = settings.get('windowBounds')

  const win = new BrowserWindow({
    width: bounds?.width ?? 1000,
    height: bounds?.height ?? 700,
    x: bounds?.x,
    y: bounds?.y,
    show: false,
    // 標準枠を外して自前タイトルバーを使う（src/renderer/src/ui/TitleBar.tsx）
    frame: false,
    titleBarStyle: 'hidden',
    // 枠が無いと最小サイズを割ると崩れやすいので下限を決めておく
    minWidth: 480,
    minHeight: 360,
    // 枠は自前だが、タスクバーや Alt+Tab には OS がこの値を出す
    title: DISPLAY_NAME,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (bounds?.maximized) win.maximize()
  win.once('ready-to-show', () => win.show())
  watchMaximizeState(win)

  // 終了時ではなく閉じる直前に控える。終了時に書こうとすると
  // プロセスが先に落ちて保存できないことがある。
  win.on('close', () => {
    const normal = win.getNormalBounds()
    settings.set('windowBounds', {
      x: normal.x,
      y: normal.y,
      width: normal.width,
      height: normal.height,
      maximized: win.isMaximized()
    })
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  store = createDb()
  settings = new SettingsStore(store.db)
  backup = new BackupService(store.sqlite, store.file, settings)

  setDebugLogging(settings.get('debugLogging'))
  log.info('起動した', {
    バージョン: app.getVersion(),
    Electron: process.versions.electron,
    保存先: app.getPath('userData')
  })

  // 自動バックアップは起動を待たせないよう投げっぱなしにする。
  // 失敗しても中で握って crash.log に残すだけ。
  void backup.maybeAutoBackup()

  registerWindowHandlers()

  // ── 設定 KV ──
  ipcMain.handle('settings:getAll', () => settings.getAll())
  ipcMain.handle('settings:setMany', (_e, patch: Partial<Settings>) => {
    settings.setMany(patch)
  })

  // ── ログ ──
  ipcMain.handle('log:write', (_e, level: LogLevel, message: string, context?: LogContext) => {
    logFromRenderer(level, message, context)
  })
  ipcMain.handle('log:openFolder', () => shell.openPath(logsDir()))

  // ── バックアップ ──
  ipcMain.handle('backup:create', () => backup.create())
  ipcMain.handle('backup:list', () => backup.list())
  ipcMain.handle('backup:openFolder', () => shell.openPath(backupDir()))

  /**
   * 復元は「待避 → 再起動」の2段。即座に入れ替えないのは、
   * 起動中の DB ファイルを掴んでいて上書きできないため。
   *
   * 実行確認はレンダラ側の共通ダイアログ（ui/dialog）で取る。
   * main 側でも showMessageBox を出すと二重に確認することになるので置かない。
   */
  ipcMain.handle('backup:restore', (_e, path: string) => {
    backup.stageRestore(path)
    app.relaunch()
    app.quit()
    return true
  })

  // ── 動作確認用 ──
  ipcMain.handle('notes:list', () => store.db.select().from(notes).all())

  ipcMain.handle('notes:add', (_e, body: string) => {
    store.db.insert(notes).values({ body, createdAt: new Date().toISOString() }).run()
  })

  ipcMain.handle('notes:update', (_e, id: number, body: string) => {
    store.db.update(notes).set({ body }).where(eq(notes.id, id)).run()
  })

  ipcMain.handle('notes:remove', (_e, id: number) => {
    store.db.delete(notes).where(eq(notes.id, id)).run()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
