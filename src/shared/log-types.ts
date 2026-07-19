/** ログの重大度。debug は既定では書かない（設定で有効化する）。 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * ログに添える情報。
 *
 * **不具合報告に必要なものを最初から入れる**のが狙い。
 * 「通信エラーが発生しました」だけでは何も分からないので、
 * 呼び出し側が状況を key-value で渡す。キー名は日本語でよい（人が読むため）。
 *
 *   log.error('APIの呼び出しに失敗した', {
 *     API: 'example.com/v2/user',
 *     HTTP: 429,
 *     'Request ID': 'abc123',
 *     Response: 'rate limit exceeded'
 *   })
 *
 * 秘密情報は書き出し時に自動で伏せられるが、**そもそも渡さないのが最善**。
 */
export type LogContext = Record<string, unknown>

export type LogEntry = {
  /** ISO8601（UTC） */
  time: string
  level: LogLevel
  /** 発生元。'main' / 'renderer' など */
  source: string
  message: string
  context?: LogContext
}
