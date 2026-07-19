import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { createDb } from './db'
import { notes } from './db/schema'
import { installCrashLog } from './crash-log'
import { SettingsStore } from './settings'
import type { Settings } from '../shared/settings'

// 未処理例外の安全網は「何よりも先に」入れる（Oto棚の作法）。
// ここより前で落ちると原因が残らないため、DB を開くより前に仕掛ける。
installCrashLog()

let store: ReturnType<typeof createDb>
let settings: SettingsStore

function createWindow(): void {
  const bounds = settings.get('windowBounds')

  const win = new BrowserWindow({
    width: bounds?.width ?? 1000,
    height: bounds?.height ?? 700,
    x: bounds?.x,
    y: bounds?.y,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (bounds?.maximized) win.maximize()
  win.once('ready-to-show', () => win.show())

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

  // ── 設定 KV ──
  ipcMain.handle('settings:getAll', () => settings.getAll())
  ipcMain.handle('settings:setMany', (_e, patch: Partial<Settings>) => {
    settings.setMany(patch)
  })

  // ── 動作確認用 ──
  ipcMain.handle('notes:list', () => store.db.select().from(notes).all())

  ipcMain.handle('notes:add', (_e, body: string) => {
    store.db.insert(notes).values({ body, createdAt: new Date().toISOString() }).run()
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
