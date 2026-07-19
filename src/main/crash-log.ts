import { log } from './log'

/**
 * 未処理例外の安全網（Oto棚が唯一持っていた作法の移植）。
 *
 * 握り潰すのではなく「必ず記録に残す」のが目的。
 * 落ちた原因を後から追える／追えないの差は開発中に効く。
 *
 * 記録先は logs/error.log（＋ app.jsonl）。
 * 以前は crash.log を別に持っていたが、**同じ事象が複数ファイルに散ると
 * 時系列を追いにくい**ので、ログ基盤に一本化した。
 */
export function installCrashLog(): void {
  process.on('uncaughtException', (err) => {
    log.error('捕まえられなかった例外が起きた', {
      種類: 'uncaughtException',
      詳細: err
    })
  })

  process.on('unhandledRejection', (reason) => {
    log.error('待ち受けられていない Promise の失敗が起きた', {
      種類: 'unhandledRejection',
      詳細: reason
    })
  })
}

/** 個別の失敗を記録する（起動を止めたくない箇所から呼ぶ）。 */
export function logCrash(source: string, err: unknown): void {
  log.error(`処理に失敗した（${source}）`, { 発生箇所: source, 詳細: err })
}
