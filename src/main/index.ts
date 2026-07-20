import { app, BrowserWindow, dialog, ipcMain, Menu, screen, shell } from 'electron'
import { join } from 'path'
import { APP_ID, APP_VERSION, DISPLAY_NAME, INTERNAL_NAME } from '../shared/app-meta'
import { eq } from 'drizzle-orm'
import { createDb } from './db'
import { notes } from './db/schema'
import { installCrashLog } from './crash-log'
import { SettingsStore } from './settings'
import { BackupService, backupDir } from './backup'
import { registerWindowHandlers, watchMaximizeState } from './window'
import { log, logFromRenderer, logsDir, setDebugLogging } from './log'
import { SecretStore, type SecretStatus } from './secrets'
import { checkForUpdate, openReleasePage } from './update-check'
import { readFileSync } from 'fs'
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
//
// ただし固定してしまうと Electron の --user-data-dir も効かなくなり、
// **自動テストが本番のデータを壊す**。環境変数での差し替えだけは許す。
app.setName(INTERNAL_NAME)
app.setPath(
  'userData',
  process.env.APP_USER_DATA_DIR ?? join(app.getPath('appData'), INTERNAL_NAME)
)
// タスクバーのグループ化・通知の識別子。インストーラ側の設定と一致させること。
app.setAppUserModelId(APP_ID)

/**
 * 多重起動を防ぐ。
 *
 * 同じ userData を 2 つのプロセスが掴むと、SQLite だけでなく
 * **Chromium のキャッシュ／quota データベースがロック競合を起こす**。
 * XNest ではこれで画面がスプラッシュのまま止まる実害が出た。
 * 2 つ目の起動は諦めさせ、代わりに既にある窓を前へ出す。
 *
 * ※テストは userData を分けているので、この制限に引っかからない。
 */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
}

let store: ReturnType<typeof createDb>
let settings: SettingsStore
let backup: BackupService
let secrets: SecretStore

/**
 * 保存した位置が今の画面に収まっているかを見る。
 *
 * モニタを外した・解像度を変えた後だと、記憶した座標が**画面の外**になり、
 * 窓が見えないまま起動して「起動しない」と誤解される。
 * どの画面にも重なっていなければ位置を捨て、OS に任せて中央へ出す。
 */
function isOnScreen(bounds: { x: number; y: number; width: number; height: number }): boolean {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea
    // 端が少しでも重なっていればよい（完全に含まれる必要はない）
    return (
      bounds.x < a.x + a.width &&
      bounds.x + bounds.width > a.x &&
      bounds.y < a.y + a.height &&
      bounds.y + bounds.height > a.y
    )
  })
}

function createWindow(): void {
  const saved = settings.get('windowBounds')
  // 画面外なら位置だけ捨てる（大きさは活かす）
  const usable = saved && isOnScreen(saved)
  if (saved && !usable) {
    log.info('保存したウィンドウ位置が画面外だったので既定位置で開く', { 保存値: saved })
  }
  const bounds = usable ? saved : saved ? { ...saved, x: undefined, y: undefined } : null

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

app.whenReady().then(startup).catch(onStartupFailed)

/**
 * 起動処理が失敗した時に、**黙って死なせない**。
 *
 * 以前は whenReady の中で例外が出ると窓が作られないまま静かに終わり、
 * ログを見るまで何が起きたのか分からなかった（実際に踏んだ）。
 * 利用者にとっては「起動しない」としか見えないので、必ず理由を出す。
 */
function onStartupFailed(err: unknown): void {
  log.error('起動に失敗した', { 詳細: err })
  const detail = err instanceof Error ? err.message : String(err)
  try {
    dialog.showErrorBox(
      `${DISPLAY_NAME} を起動できなかった`,
      `${detail}\n\n詳しい記録: ${join(app.getPath('userData'), 'logs', 'error.log')}`
    )
  } catch {
    // ダイアログすら出せない状況でも、ログには残っている
  }
  app.quit()
}

function startup(): void {
  /**
   * 既定のメニューバー（File / Edit / View …）を消す。
   *
   * 自前のタイトルバーを使っているので、その下に OS のメニューが出ると二重になる。
   * 既存アプリ（映棚・PixNest・XNest）も揃って消している。
   *
   * NOTE: これを消すと Ctrl+C / Ctrl+V などの標準ショートカットも効かなくなる。
   *       入力欄を持つなら、必要な項目だけのメニューを作って割り当てること
   *       （CommandDeck が「編集／表示」だけの最小メニューを作っている）。
   *       この雛形は入力欄が少ないので、まず消す方を既定にしている。
   */
  Menu.setApplicationMenu(null)

  store = createDb()
  settings = new SettingsStore(store.db)
  backup = new BackupService(store.sqlite, store.file, settings)
  secrets = new SecretStore(store.db)

  setDebugLogging(settings.get('debugLogging'))

  // 別PCへ復元した等で復号できなくなった秘密情報を知らせる。
  // 黙って失敗すると「なぜか繋がらない」と悩ませることになる。
  const broken = secrets.listUndecryptable()
  if (broken.length > 0) {
    log.warn('保存済みの秘密情報を復号できなかった。入れ直しが要る', {
      対象: broken,
      理由: '別のPCやユーザーアカウントへ復元された可能性がある'
    })
  }
  log.info('起動した', {
    バージョン: APP_VERSION,
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

  // ── 秘密情報 ──
  // **値を返す口は用意しない。** 平文が IPC を渡ってレンダラーのメモリに残るのを避けるため。
  // 秘密を使う処理は main 側に置き、レンダラーからは「設定した/消した/状態」だけを扱う。
  ipcMain.handle('secrets:set', (_e, key: string, value: string) => secrets.set(key, value))
  ipcMain.handle('secrets:clear', (_e, key: string) => secrets.clear(key))
  ipcMain.handle('secrets:status', (_e, key: string): SecretStatus => secrets.status(key))

  // ── 版と更新 ──
  ipcMain.handle('app:version', () => APP_VERSION)
  ipcMain.handle('app:checkUpdate', () => checkForUpdate())
  ipcMain.handle('app:openReleases', (_e, url?: string) => openReleasePage(url))

  /** 変更履歴を読む。配布時は resources 配下に置かれる（package.json の extraResources） */
  ipcMain.handle('app:changelog', () => {
    const candidates = app.isPackaged
      ? [join(process.resourcesPath, 'CHANGELOG.md')]
      : [join(__dirname, '..', '..', 'CHANGELOG.md'), join(app.getAppPath(), 'CHANGELOG.md')]
    for (const path of candidates) {
      try {
        return readFileSync(path, 'utf8')
      } catch {
        // 次の候補へ
      }
    }
    log.warn('変更履歴を読めなかった', { 探した場所: candidates })
    return null
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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
