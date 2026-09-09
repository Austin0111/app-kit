import { app } from 'electron'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync
} from 'fs'
import { dirname, extname, join, relative } from 'path'
import Database from 'better-sqlite3'
import type BetterSqlite3 from 'better-sqlite3'
import type { SettingsStore } from './settings'
import { logCrash } from './crash-log'
import { INTERNAL_NAME } from '../shared/app-meta'

/**
 * バックアップと復元。
 *
 * 棚卸しで見つかった 3 つの実装のいいとこ取りをしている。
 * - XNest      … SQLite の Online Backup API（`db.backup()`）を使う
 * - PixNest    … 起動時の自動チェック＋世代管理
 * - Oto棚      … 復元は staging して「次回起動時に適用」する
 *
 * 【方式の判断】
 * PixNest は「`wal_checkpoint(TRUNCATE)` してからファイルコピー」していたが、
 * ここでは採らない。checkpoint は動作中の DB を触る副作用がある上、
 * Online Backup API は WAL の内容も含めて一貫したスナップショットを取れるため、
 * 手動 checkpoint そのものが不要になる。**XNest の方式が上位互換**。
 *
 * 【なぜ復元が staging なのか】
 * 起動中の DB ファイルは掴まれていて上書きできない（実機で確認済み）。
 * そこで復元は「隣に .restore として置くだけ」にして、次回起動の
 * DB を開く前に適用する。
 */

const RESTORE_SUFFIX = '.restore'
// バックアップ名も表示名ではなく内部識別子から作る（改名しても既存分を見失わない）
const BACKUP_PREFIX = `${INTERNAL_NAME}_`
const BACKUP_EXT = '.db'
const REQUIRED_TABLES = ['settings', 'notes'] as const

/**
 * ファイル名用の日時（ローカル時刻）。
 * toISOString は UTC なので、エクスプローラで見た更新日時と日付がズレて紛らわしい。
 * 一覧の並び替えは mtime で行うので、名前が UTC 単調でなくても困らない。
 */
function localStamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}

function nextBackupPath(): string {
  const dir = backupDir()
  const stem = `${BACKUP_PREFIX}${localStamp()}`
  let path = join(dir, stem + BACKUP_EXT)
  for (let suffix = 1; existsSync(path); suffix++) {
    path = join(dir, `${stem}_${suffix}${BACKUP_EXT}`)
  }
  return path
}

export function backupDir(): string {
  const dir = join(app.getPath('userData'), 'backups')
  mkdirSync(dir, { recursive: true })
  return dir
}

function validateDatabase(path: string): void {
  let db: BetterSqlite3.Database | null = null
  try {
    db = new Database(path, { readonly: true, fileMustExist: true })
    const check = db.pragma('quick_check') as { quick_check: string }[]
    if (check.length !== 1 || check[0]?.quick_check !== 'ok') {
      throw new Error('データベースの整合性検査に失敗した')
    }
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[]
    const names = new Set(rows.map((row) => row.name))
    if (REQUIRED_TABLES.some((name) => !names.has(name))) {
      throw new Error('このアプリのバックアップではない')
    }
  } finally {
    db?.close()
  }
}

/** renderer が指定できるのは、このアプリ自身が列挙したバックアップだけ。 */
function validateRestoreSource(srcPath: string): string {
  if (typeof srcPath !== 'string' || extname(srcPath).toLowerCase() !== BACKUP_EXT) {
    throw new Error('復元元のファイルが正しくない')
  }
  if (!existsSync(srcPath) || !statSync(srcPath).isFile()) {
    throw new Error('復元元のファイルが見つからない')
  }

  const root = realpathSync(backupDir())
  const source = realpathSync(srcPath)
  const rel = relative(root, source)
  if (!rel || rel.startsWith('..') || rel.includes(':') || dirname(rel) !== '.') {
    throw new Error('バックアップフォルダ外からの復元を拒否した')
  }
  const name = rel
  if (!name.startsWith(BACKUP_PREFIX) || !name.endsWith(BACKUP_EXT)) {
    throw new Error('このアプリのバックアップではない')
  }
  validateDatabase(source)
  return source
}

/**
 * 待避された復元ファイルがあれば本番へ適用する。
 * **DB を開く前に呼ぶこと。**（開いた後だとファイルを掴んでいて置き換えられない）
 */
export function applyPendingRestore(dbPath: string): boolean {
  const pending = dbPath + RESTORE_SUFFIX
  if (!existsSync(pending)) return false
  const rollback = dbPath + '.before-restore'
  try {
    // staging 後にファイルが差し替えられていても、本番DBへ入れる直前に再検査する。
    validateDatabase(pending)

    // WAL/SHM が残っていると復元した本体と食い違うので必ず捨てる
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = dbPath + suffix
      if (existsSync(sidecar)) rmSync(sidecar, { force: true })
    }

    // 現DBを同じディレクトリへ退避してからrenameする。適用に失敗したら元へ戻す。
    if (existsSync(rollback)) rmSync(rollback, { force: true })
    if (existsSync(dbPath)) renameSync(dbPath, rollback)
    try {
      renameSync(pending, dbPath)
    } catch (err) {
      if (existsSync(rollback)) renameSync(rollback, dbPath)
      throw err
    }
    if (existsSync(rollback)) rmSync(rollback, { force: true })
    return true
  } catch (err) {
    // 失敗しても既存 DB で起動を続ける（起動不能にしない）
    logCrash('applyPendingRestore', err)
    return false
  }
}

export type BackupEntry = {
  path: string
  name: string
  size: number
  createdAt: string
}

export class BackupService {
  constructor(
    private readonly sqlite: BetterSqlite3.Database,
    private readonly dbPath: string,
    private readonly settings: SettingsStore
  ) {}

  /** バックアップを 1 本取り、世代数を超えた古いものを消す。戻り値は作成したファイルのパス。 */
  async create(): Promise<string> {
    const dest = nextBackupPath()

    // Online Backup API。動作中でも一貫したスナップショットが取れる。
    await this.sqlite.backup(dest)

    this.prune()
    return dest
  }

  list(): BackupEntry[] {
    const dir = backupDir()
    return readdirSync(dir)
      .filter((n) => n.startsWith(BACKUP_PREFIX) && n.endsWith(BACKUP_EXT))
      .map((name) => {
        const path = join(dir, name)
        const st = statSync(path)
        return { path, name, size: st.size, createdAt: st.mtime.toISOString() }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** 保持世代数を超えた古いバックアップを消す。 */
  prune(): void {
    const keep = Math.max(1, this.settings.get('backupRetention'))
    const extra = this.list().slice(keep)
    for (const entry of extra) {
      try {
        rmSync(entry.path, { force: true })
      } catch (err) {
        logCrash('backup.prune', err)
      }
    }
  }

  /**
   * 前回から規定日数が経っていれば自動でバックアップを取る（起動時に呼ぶ）。
   * 失敗してもアプリの起動は止めない。
   */
  async maybeAutoBackup(): Promise<void> {
    const intervalDays = this.settings.get('backupIntervalDays')
    if (intervalDays <= 0) return

    const last = this.settings.get('lastBackupAt')
    if (last) {
      const elapsedMs = Date.now() - new Date(last).getTime()
      if (elapsedMs < intervalDays * 24 * 60 * 60 * 1000) return
    }

    try {
      await this.create()
      this.settings.set('lastBackupAt', new Date().toISOString())
    } catch (err) {
      logCrash('backup.auto', err)
    }
  }

  /**
   * 復元ファイルを待避する。実際の入れ替えは次回起動時（applyPendingRestore）。
   * 呼び出し側は、この後アプリを再起動させること。
   */
  async stageRestore(srcPath: string): Promise<void> {
    const source = validateRestoreSource(srcPath)
    const pending = this.dbPath + RESTORE_SUFFIX
    // 一旦テンポラリへ写してから rename する（コピー途中で落ちても
    // 中途半端な .restore を次回起動が拾わないように）
    const tmp = pending + '.tmp'
    try {
      copyFileSync(source, tmp)
      validateDatabase(tmp)

      // 復元操作の直前状態もOnline Backup APIで保存し、取り消し経路を残す。
      await this.create()
      renameSync(tmp, pending)
    } finally {
      if (existsSync(tmp)) rmSync(tmp, { force: true })
    }
  }
}
