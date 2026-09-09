import { BrowserWindow } from 'electron'
import { settings as settingsTable } from './db/schema'
import { safeSend } from './ipc-safe'
import {
  defaultSettings,
  SETTINGS_KEYS,
  type Settings,
  type SettingsKey
} from '../shared/settings'
import type { Db } from './db'
import { logCrash } from './crash-log'
import { IPC_SEND_CHANNELS } from '../shared/ipc-channels'

export const SETTINGS_CHANGED_CHANNEL = IPC_SEND_CHANNELS.settingsChanged

/**
 * 設定 KV の保持と永続化。
 *
 * 値は JSON 文字列として 1 列に入れる。文字列・数値・真偽値・オブジェクトを
 * 同じ経路で扱えるので、型ごとの列を作らずに済む。
 *
 * 書き込み戦略について:
 *   CharaLauncher は自前 JSON が数MBに育って「非同期＋コアレス＋アトミック書き込み」まで
 *   作り込む羽目になったが、SQLite は 1 行 UPSERT で書き込みが完結し、原子性も
 *   トランザクションが保証する。よってあの作り込みはここでは不要。
 */
export class SettingsStore {
  private cache: Settings

  constructor(private readonly db: Db['db']) {
    this.cache = this.load()
  }

  getAll(): Settings {
    return structuredClone(this.cache)
  }

  get<K extends SettingsKey>(key: K): Settings[K] {
    return this.cache[key]
  }

  set<K extends SettingsKey>(key: K, value: Settings[K]): void {
    this.setMany({ [key]: value } as Pick<Settings, K>)
  }

  /** 複数キーをまとめて更新する（1 トランザクション・通知も 1 回）。 */
  setMany(patch: Partial<Settings>): void {
    const entries = Object.entries(patch).filter(([k]) =>
      SETTINGS_KEYS.includes(k as SettingsKey)
    )
    if (entries.length === 0) return

    this.db.transaction((tx) => {
      for (const [key, value] of entries) {
        tx.insert(settingsTable)
          .values({ key, value: JSON.stringify(value) })
          .onConflictDoUpdate({
            target: settingsTable.key,
            set: { value: JSON.stringify(value) }
          })
          .run()
      }
    })

    Object.assign(this.cache, Object.fromEntries(entries))
    this.broadcast(Object.fromEntries(entries) as Partial<Settings>)
  }

  /**
   * DB から読み、既定値の上に重ねる。
   * 「既定値つきで一括返却」という XNest の形を、型で縛った上で踏襲する。
   */
  private load(): Settings {
    const result = defaultSettings()
    let rows: { key: string; value: string | null }[] = []
    try {
      rows = this.db.select().from(settingsTable).all()
    } catch (err) {
      // 壊れていても既定値で続行する（起動を止めない）
      logCrash('settings.load', err)
      return result
    }

    for (const row of rows) {
      // 定義に無いキー＝昔のバージョンの残骸。無視する（消しはしない）
      if (!SETTINGS_KEYS.includes(row.key as SettingsKey)) continue
      if (row.value == null) continue
      try {
        // 1 キーの破損が全体を巻き添えにしないよう、値ごとに try する
        Object.assign(result, { [row.key]: JSON.parse(row.value) })
      } catch {
        // その1キーだけ既定値のまま
      }
    }
    return result
  }

  /** 全ウィンドウへ変更を通知する（複数窓で設定がズレないように）。 */
  private broadcast(patch: Partial<Settings>): void {
    for (const win of BrowserWindow.getAllWindows()) {
      safeSend(win, SETTINGS_CHANGED_CHANNEL, patch)
    }
  }
}
