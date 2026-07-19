import { app } from 'electron'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * 未処理例外の安全網（Oto棚が唯一持っていた作法の移植）。
 *
 * 握り潰すのではなく「必ず記録に残す」のが目的。
 * 落ちた原因を後から追える／追えないの差は開発中に効く。
 */
export function installCrashLog(): void {
  process.on('uncaughtException', (err) => {
    logCrash('uncaughtException', err)
  })

  process.on('unhandledRejection', (reason) => {
    logCrash('unhandledRejection', reason)
  })
}

export function logCrash(source: string, err: unknown): void {
  try {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString()
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err)
    appendFileSync(join(dir, 'crash.log'), `===== ${stamp} [${source}] =====\n${detail}\n\n`, 'utf8')
  } catch {
    // ログ書き込みの失敗でアプリを落とさない
  }
}
