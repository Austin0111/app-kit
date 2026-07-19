import type { LogContext } from '../../shared/log-types'

/**
 * renderer 側のログ。実体は main へ送って 1 箇所にまとめる
 * （ファイルが分かれると時系列を突き合わせられなくなるため）。
 */
export const log = {
  debug: (message: string, context?: LogContext) => window.api.log.write('debug', message, context),
  info: (message: string, context?: LogContext) => window.api.log.write('info', message, context),
  warn: (message: string, context?: LogContext) => window.api.log.write('warn', message, context),
  error: (message: string, context?: LogContext) => window.api.log.write('error', message, context)
}

/**
 * renderer で拾えなかったエラーを記録する。
 *
 * **これが無いと React の不具合が DevTools のコンソールにしか出ず、記録に残らない。**
 * 実際、開発中に UI が真っ白になった時、原因はコンソールを開かないと分からなかった。
 */
export function installRendererErrorLogging(): void {
  window.addEventListener('error', (e) => {
    log.error('画面側で捕まえられなかったエラーが起きた', {
      内容: e.message,
      ファイル: e.filename,
      行: e.lineno,
      列: e.colno,
      詳細: e.error instanceof Error ? e.error.stack : undefined
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason
    log.error('画面側で待ち受けられていない Promise の失敗が起きた', {
      内容: reason instanceof Error ? reason.message : String(reason),
      詳細: reason instanceof Error ? reason.stack : undefined
    })
  })
}
