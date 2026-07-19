import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * カスタムタイトルバー。
 *
 * 【ドラッグ領域は -webkit-app-region で作る】
 *   バーに `drag`、その中の操作できる要素に **`no-drag` を必ず付ける**。
 *   これを忘れるとボタンが押せなくなる（ドラッグ領域はクリックを飲む）。
 *   → CSS 側で `.titlebar__button` 等に no-drag を当ててあるので、
 *     バーに要素を足す時は同じ扱いにすること。
 *
 * 【なぜ app-region を選んだか（映棚とは別の判断）】
 *   映棚は「app-region はクリック等を殺す」として getPosition/setPosition による
 *   JS ドラッグを採っている。ただしその方式は **Aero Snap（画面端へ寄せて最大化・
 *   左右半分）が効かなくなる** うえ、ドラッグ中に IPC が往復して重い。
 *   バーに操作要素が密集していないなら app-region の方が素直で、OS の作法にも乗る。
 *   バーを操作要素で埋める設計にするなら映棚の方式を検討すること。
 *
 * 【ダブルクリックでの最大化】
 *   app-region:drag の領域は OS からキャプション扱いされるので、
 *   Windows ではダブルクリック最大化が自前実装なしで効く。
 */
export function TitleBar({
  title,
  children
}: {
  title: string
  /** バーの中央〜右に置く追加要素（任意）。no-drag は CSS 側で当たる */
  children?: ReactNode
}): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.api.window.isMaximized().then(setMaximized)
    // ボタン以外の経路（スナップ・ダブルクリック・Win+↑）で変わった時も追随する
    return window.api.window.onMaximizedChange(setMaximized)
  }, [])

  return (
    <header className="titlebar">
      <div className="titlebar__title">{title}</div>
      {children && <div className="titlebar__slot">{children}</div>}
      <div className="titlebar__buttons">
        <button
          className="titlebar__button"
          onClick={() => window.api.window.minimize()}
          aria-label="最小化"
          title="最小化"
        >
          <MinimizeIcon />
        </button>
        <button
          className="titlebar__button"
          onClick={() => window.api.window.toggleMaximize()}
          aria-label={maximized ? '元のサイズに戻す' : '最大化'}
          title={maximized ? '元のサイズに戻す' : '最大化'}
        >
          {maximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button
          className="titlebar__button is-close"
          onClick={() => window.api.window.close()}
          aria-label="閉じる"
          title="閉じる"
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  )
}

/*
 * アイコンは図形で描く。
 * 「✕」「🗖」等の文字を使うとフォントによって字形・大きさが揺れ、
 * 環境によっては豆腐になる（Oto棚の ChromeWindow も同じ理由で図形描画にしている）。
 */

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1 }

function MinimizeIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <line x1="0" y1="5" x2="10" y2="5" {...STROKE} />
    </svg>
  )
}

function MaximizeIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" {...STROKE} />
    </svg>
  )
}

function RestoreIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {/* 奥の窓 */}
      <path d="M2.5 2.5 V0.5 H9.5 V7.5 H7.5" {...STROKE} />
      {/* 手前の窓 */}
      <rect x="0.5" y="2.5" width="7" height="7" {...STROKE} />
    </svg>
  )
}

function CloseIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" {...STROKE} />
      <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" {...STROKE} />
    </svg>
  )
}
