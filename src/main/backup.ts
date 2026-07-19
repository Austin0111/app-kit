import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, copyFileSync } from 'fs'
import { join } from 'path'
import type BetterSqlite3 from 'better-sqlite3'
import type { SettingsStore } from './settings'
import { logCrash } from './crash-log'

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
const BACKUP_PREFIX = 'app-kit_'
const BACKUP_EXT = '.db'

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

export function backupDir(): string {
  const dir = join(app.getPath('userData'), 'backups')
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 待避された復元ファイルがあれば本番へ適用する。
 * **DB を開く前に呼ぶこと。**（開いた後だとファイルを掴んでいて置き換えられない）
 */
export function applyPendingRestore(dbPath: string): boolean {
  const pending = dbPath + RESTORE_SUFFIX
  if (!existsSync(pending)) return false
  try {
    // WAL/SHM が残っていると復元した本体と食い違うので必ず捨てる
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = dbPath + suffix
      if (existsSync(sidecar)) rmSync(sidecar, { force: true })
    }
    copyFileSync(pending, dbPath)
    rmSync(pending, { force: true })
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
    const dir = backupDir()
    const dest = join(dir, `${BACKUP_PREFIX}${localStamp()}${BACKUP_EXT}`)

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
  stageRestore(srcPath: string): void {
    const pending = this.dbPath + RESTORE_SUFFIX
    // 一旦テンポラリへ写してから rename する（コピー途中で落ちても
    // 中途半端な .restore を次回起動が拾わないように）
    const tmp = pending + '.tmp'
    copyFileSync(srcPath, tmp)
    renameSync(tmp, pending)
  }
}
