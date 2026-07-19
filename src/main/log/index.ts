import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import { redact } from './redact'
import type { LogContext, LogEntry, LogLevel } from '../../shared/log-types'

/**
 * ログの出力先は 2 つ。役割が違うので分けている。
 *
 * - `app.jsonl`  … 全レベルを 1 行 1 JSON で。機械が読む用。饒舌なので早く入れ替わる
 * - `error.log`  … warn / error だけを整形して。**人がそのまま貼れる形**。滅多に出ないので長く残る
 *
 * 【ローテーションはサイズ主】
 *   日数だけで区切ると容量が抑えられない（クローラー等は 1 日で数百MBになりうる）。
 *   サイズ × 世代数なら総量が確定する。
 *   「饒舌なログが見たいエラーを押し出す」問題は、error.log を別系統にすることで解いている。
 */

const LOGS_DIR = 'logs'
const JSONL_NAME = 'app.jsonl'
const ERROR_NAME = 'error.log'

/** 1 ファイルの上限と世代数。総量は およそ (上限 × (世代+1)) になる。 */
const LIMITS = {
  jsonl: { maxBytes: 5 * 1024 * 1024, keep: 3 }, // 約 20MB
  error: { maxBytes: 2 * 1024 * 1024, keep: 3 } // 約 8MB
}

let debugEnabled = false

/** debug レベルを書くかどうか。設定から呼ぶ。 */
export function setDebugLogging(enabled: boolean): void {
  debugEnabled = enabled
}

export function logsDir(): string {
  const dir = join(app.getPath('userData'), LOGS_DIR)
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 上限を超えていたら世代をずらす。
 * app.jsonl → app.jsonl.1 → app.jsonl.2 → …（最古は捨てる）
 */
function rotateIfNeeded(path: string, maxBytes: number, keep: number): void {
  try {
    if (!existsSync(path) || statSync(path).size < maxBytes) return

    // 最古を消してから、後ろへ順に送る
    const oldest = `${path}.${keep}`
    if (existsSync(oldest)) rmSync(oldest, { force: true })
    for (let i = keep - 1; i >= 1; i--) {
      const from = `${path}.${i}`
      if (existsSync(from)) renameSync(from, `${path}.${i + 1}`)
    }
    renameSync(path, `${path}.1`)
  } catch {
    // ローテーションの失敗でログ自体を止めない
  }
}

function write(path: string, text: string, limit: { maxBytes: number; keep: number }): void {
  try {
    rotateIfNeeded(path, limit.maxBytes, limit.keep)
    appendFileSync(path, text, 'utf8')
  } catch {
    // ログの書き込み失敗でアプリを落とさない
  }
}

/**
 * 表示上の幅（全角＝2、半角＝1）。
 * 等幅フォントで縦を揃えるために要る。文字数で数えると日本語のキーだけズレる。
 */
function displayWidth(text: string): number {
  let w = 0
  for (const ch of text) {
    // CJK・全角記号・かな の範囲をざっくり 2 桁として扱う
    w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(
      ch
    )
      ? 2
      : 1
  }
  return w
}

/** 人が読む形に整える。key を縦に揃えて貼り付けやすくする。 */
function formatForHuman(entry: LogEntry): string {
  const label = entry.level === 'error' ? 'エラー' : '警告'
  const local = new Date(entry.time).toLocaleString('ja-JP')

  const rows: [string, string][] = [['発生', local]]
  if (entry.source) rows.push(['発生元', entry.source])
  for (const [k, v] of Object.entries(entry.context ?? {})) {
    rows.push([k, typeof v === 'string' ? v : JSON.stringify(v)])
  }

  // 全角は 2 桁分の幅を取る。[...k].length で数えると日本語のキーだけ揃わない
  const width = Math.max(...rows.map(([k]) => displayWidth(k)))
  const body = rows
    .map(([k, v]) => `  ${k}${' '.repeat(Math.max(0, width - displayWidth(k)))} : ${v}`)
    .join('\n')

  return `${'─'.repeat(60)}\n[${label}] ${entry.message}\n${body}\n`
}

function emit(level: LogLevel, source: string, message: string, context?: LogContext): void {
  if (level === 'debug' && !debugEnabled) return

  const entry: LogEntry = {
    time: new Date().toISOString(),
    level,
    source,
    message: String(message),
    // **ここが唯一の出口**。伏せ字は必ずこの 1 箇所を通る
    context: context ? (redact(context) as LogContext) : undefined
  }

  const dir = logsDir()
  write(join(dir, JSONL_NAME), JSON.stringify(entry) + '\n', LIMITS.jsonl)

  if (level === 'error' || level === 'warn') {
    write(join(dir, ERROR_NAME), formatForHuman(entry), LIMITS.error)
  }

  // 開発中はコンソールにも出す（配布版では邪魔なので出さない）
  if (!app.isPackaged) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(`[${level}] ${message}`, context ?? '')
  }
}

/** main プロセスから使うロガー。 */
export const log = {
  debug: (message: string, context?: LogContext) => emit('debug', 'main', message, context),
  info: (message: string, context?: LogContext) => emit('info', 'main', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', 'main', message, context),
  error: (message: string, context?: LogContext) => emit('error', 'main', message, context)
}

/** renderer から届いたログを書く（source を分けて記録する）。 */
export function logFromRenderer(
  level: LogLevel,
  message: string,
  context?: LogContext
): void {
  emit(level, 'renderer', message, context)
}
