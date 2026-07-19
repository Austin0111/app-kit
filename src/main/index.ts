import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { createDb } from './db'
import { settings, notes } from './db/schema'
import { installCrashLog } from './crash-log'

// 未処理例外の安全網は「何よりも先に」入れる（Oto棚の作法）。
// ここより前で落ちると原因が残らないため、DB を開くより前に仕掛ける。
installCrashLog()

let store: ReturnType<typeof createDb>

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  store = createDb()

  // ── 設定 KV ──
  // XNest の settings:get に倣い「既定値つきで一括返却」する形にしている。
  ipcMain.handle('settings:getAll', (_e, defaults: Record<string, string>) => {
    const rows = store.db.select().from(settings).all()
    const found = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
    return { ...defaults, ...found }
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    store.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run()
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
