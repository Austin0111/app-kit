import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { arch, platform, release } from 'os'
import { join } from 'path'
import type BetterSqlite3 from 'better-sqlite3'
import { APP_VERSION, INTERNAL_NAME } from '../shared/app-meta'
import type { SettingsStore } from './settings'
import { logsDir } from './log'
import { redact, redactString } from './log/redact'

const MAX_LOG_BYTES = 1024 * 1024
const CRASH_KINDS = new Set([
  'uncaughtException',
  'unhandledRejection',
  'render-process-gone',
  'child-process-gone',
  'unresponsive',
  'did-fail-load',
  'renderer-recovery-limit'
])

type ZipEntry = { name: string; data: Buffer }

function outputDir(): string {
  const dir = join(app.getPath('userData'), 'diagnostics')
  mkdirSync(dir, { recursive: true })
  return dir
}

function nextOutputPath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  const stem = `${INTERNAL_NAME}_diagnostics_${stamp}`
  let path = join(outputDir(), `${stem}.zip`)
  for (let suffix = 1; existsSync(path); suffix++) path = join(outputDir(), `${stem}_${suffix}.zip`)
  return path
}

function scrubLocalPaths(text: string): string {
  const replacements = [
    [app.getPath('userData'), '[userData]'],
    [app.getPath('home'), '[home]'],
    [process.cwd(), '[cwd]']
  ] as const
  return replacements.reduce(
    (value, [source, replacement]) =>
      source ? value.split(source).join(replacement).split(source.replace(/\\/g, '/')).join(replacement) : value,
    text
  )
}

/** 古い版が残したログも、ZIPへ入れる直前にもう一度伏せ字にする。 */
export function sanitizeDiagnosticLog(text: string, jsonLines: boolean): string {
  if (!jsonLines) return scrubLocalPaths(redactString(text))

  const lines = text.split(/\r?\n/)
  return scrubLocalPaths(
    lines
      .map((line) => {
        if (!line) return ''
        try {
          return JSON.stringify(redact(JSON.parse(line)))
        } catch {
          return redactString(line)
        }
      })
      .join('\n')
  )
}

function readLog(name: 'app.jsonl' | 'error.log'): string {
  const path = join(logsDir(), name)
  if (!existsSync(path)) return ''
  const data = readFileSync(path)
  const tail = data.subarray(Math.max(0, data.length - MAX_LOG_BYTES)).toString('utf8')
  return sanitizeDiagnosticLog(tail, name.endsWith('.jsonl'))
}

function recentCrashes(jsonl: string): unknown[] {
  const found: unknown[] = []
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line) continue
    try {
      const entry = JSON.parse(line) as Record<string, unknown>
      const context = entry.context as Record<string, unknown> | undefined
      if (typeof context?.['種類'] === 'string' && CRASH_KINDS.has(context['種類'])) found.push(entry)
    } catch {
      // 途中から切り出された先頭行などは無視する
    }
  }
  return found.slice(-20)
}

function settingShape(settings: SettingsStore): Record<string, string> {
  return Object.fromEntries(
    Object.entries(settings.getAll()).map(([key, value]) => [
      key,
      value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
    ])
  )
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** 外部依存を増やさない、固定allowlist専用のstore形式ZIP writer。 */
function makeZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const crc = crc32(entry.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(dosTime, 10)
    local.writeUInt16LE(dosDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(dosTime, 12)
    central.writeUInt16LE(dosDate, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + entry.data.length
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, ...centrals, end])
}

export class DiagnosticsService {
  constructor(
    private readonly sqlite: BetterSqlite3.Database,
    private readonly settings: SettingsStore
  ) {}

  create(): string {
    const appLog = readLog('app.jsonl')
    const errorLog = readLog('error.log')
    let databaseHealth: unknown = 'unavailable'
    try {
      databaseHealth = this.sqlite.pragma('quick_check')
    } catch {
      databaseHealth = 'check-failed'
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      app: { version: APP_VERSION },
      runtime: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
      },
      os: { platform: platform(), release: release(), arch: arch() },
      databaseHealth,
      recentCrashes: recentCrashes(appLog)
    }
    const entries: ZipEntry[] = [
      { name: 'summary.json', data: Buffer.from(JSON.stringify(summary, null, 2), 'utf8') },
      { name: 'settings-shape.json', data: Buffer.from(JSON.stringify(settingShape(this.settings), null, 2), 'utf8') },
      { name: 'logs/app.jsonl', data: Buffer.from(appLog, 'utf8') },
      { name: 'logs/error.log', data: Buffer.from(errorLog, 'utf8') }
    ]

    const path = nextOutputPath()
    const tmp = `${path}.tmp`
    try {
      writeFileSync(tmp, makeZip(entries))
      renameSync(tmp, path)
      return path
    } finally {
      if (existsSync(tmp)) rmSync(tmp, { force: true })
    }
  }
}
