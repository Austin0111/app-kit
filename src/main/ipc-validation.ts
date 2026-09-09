import {
  SETTINGS_KEYS,
  type Settings,
  type SettingsKey,
  type WindowBounds
} from '../shared/settings'
import type { LogContext, LogLevel } from '../shared/log-types'

function fail(name: string): never {
  throw new TypeError(`${name} が正しくない`)
}

export function requireString(value: unknown, name: string, maxLength = 100_000): string {
  if (typeof value !== 'string' || value.length > maxLength) fail(name)
  return value
}

export function requireSecretKey(value: unknown): string {
  const key = requireString(value, '秘密情報の項目名', 100)
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) fail('秘密情報の項目名')
  return key
}

export function requirePositiveId(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) fail('ID')
  return value as number
}

export function requireLogLevel(value: unknown): LogLevel {
  if (!['debug', 'info', 'warn', 'error'].includes(value as string)) fail('ログレベル')
  return value as LogLevel
}

export function requireLogContext(value: unknown): LogContext | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('ログ情報')
  return value as LogContext
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isWindowBounds(value: unknown): value is WindowBounds | null {
  if (value === null) return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Partial<WindowBounds>
  return (
    isFiniteNumber(v.x) &&
    isFiniteNumber(v.y) &&
    isFiniteNumber(v.width) &&
    v.width > 0 &&
    isFiniteNumber(v.height) &&
    v.height > 0 &&
    typeof v.maximized === 'boolean'
  )
}

function validSetting(key: SettingsKey, value: unknown): boolean {
  switch (key) {
    case 'theme':
      return value === 'dark' || value === 'light'
    case 'accentColor':
      return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    case 'sidebarWidth':
      return isFiniteNumber(value) && value >= 100 && value <= 2000
    case 'showStatusBar':
    case 'debugLogging':
      return typeof value === 'boolean'
    case 'windowBounds':
      return isWindowBounds(value)
    case 'backupIntervalDays':
      return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 3650
    case 'backupRetention':
      return Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 1000
    case 'lastBackupAt':
      return (
        value === null ||
        (typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value)))
      )
  }
}

export function requireSettingsPatch(value: unknown): Partial<Settings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('設定')
  const entries = Object.entries(value)
  for (const [key, setting] of entries) {
    if (!SETTINGS_KEYS.includes(key as SettingsKey) || !validSetting(key as SettingsKey, setting)) {
      fail(`設定 ${key}`)
    }
  }
  return Object.fromEntries(entries) as Partial<Settings>
}
