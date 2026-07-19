/**
 * 設定の唯一の定義。既定値と型をここ 1 箇所で決め、main と renderer の両方から参照する。
 *
 * 棚卸しでの反省点:
 * - XNest は settings:get が既定値つきで約 45 キーを一括返却していて形は良かったが、
 *   型が無いため「既定値の綴りと実際のキーがズレても気づけない」状態だった。
 * - My棚 は UI 状態とAPIキーが localStorage に散っていて、どこに何があるか追えなくなっていた。
 *
 * → 「定義は1箇所・型で縛る・保存先は1つ」を出発点にする。
 */

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}

/**
 * 既定値。ここに書いたキーだけが有効な設定として扱われる。
 * DB 側に見知らぬキーが残っていても（＝昔のバージョンの残骸）読み込み時に無視される。
 */
export const SETTINGS_DEFAULTS = {
  theme: 'dark' as 'dark' | 'light',
  accentColor: '#7c3aed',
  sidebarWidth: 260,
  showStatusBar: true,
  windowBounds: null as WindowBounds | null,

  // ── バックアップ ──
  /** 自動バックアップの間隔（日）。0 で自動バックアップを止める。 */
  backupIntervalDays: 7,
  /** 保持する世代数。超えた分は古いものから消す。 */
  backupRetention: 10,
  /** 最後に自動バックアップを取った時刻（ISO8601）。未実施なら null。 */
  lastBackupAt: null as string | null
}

export type Settings = typeof SETTINGS_DEFAULTS
export type SettingsKey = keyof Settings

export const SETTINGS_KEYS = Object.keys(SETTINGS_DEFAULTS) as SettingsKey[]

/** 既定値の複製を返す（呼び出し側で書き換えても定義本体が汚れないように）。 */
export function defaultSettings(): Settings {
  return structuredClone(SETTINGS_DEFAULTS)
}
