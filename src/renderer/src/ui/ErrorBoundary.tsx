import { Component, type ErrorInfo, type ReactNode } from 'react'
import { log } from '../log'

/**
 * 描画中の例外を受け止める。
 *
 * これが無いと、React は例外が出た枝を丸ごと外すため **画面が真っ白になる**。
 * ログには残るが、利用者からは「壊れた」としか見えず、何をすればよいか分からない。
 * 起動失敗には main 側で対処済みだが、**描画中の失敗はここでしか拾えない**。
 *
 * NOTE: これで拾えるのは「描画中」の例外だけ。イベントハンドラや
 *       非同期処理の中で投げられたものは捕まらない（React の仕様）。
 *       そちらは main.tsx の window 'error' / 'unhandledrejection' が拾う。
 */
type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('画面の描画中にエラーが起きた', {
      内容: error.message,
      詳細: error.stack,
      発生箇所: info.componentStack
    })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash">
        <h1 className="crash__title">画面の表示に失敗した</h1>
        <p className="crash__lead">
          操作は中断されたが、保存済みのデータは無事じゃ。
          <br />
          開き直しても直らない場合は、下の記録を添えて知らせてほしい。
        </p>

        <pre className="crash__detail">{error.message}</pre>

        <div className="row">
          {/* 状態を捨てて描き直す。多くの場合これで戻る */}
          <button onClick={() => this.setState({ error: null })}>もう一度描画する</button>
          <button onClick={() => location.reload()}>画面を開き直す</button>
          <button onClick={() => window.api.log.openFolder()}>記録を開く</button>
        </div>
      </div>
    )
  }
}
