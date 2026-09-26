import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * モーダルダイアログ（confirm / prompt / 任意ボタン）。
 *
 * 棚卸しの結論を反映した設計:
 * - 7 本すべてが独立に自前 confirm を書いていた。共通APIの要件は
 *   「ボタン n 個」（Prompt Builder に3択の showConfirm3 があった）と
 *   「入力を受けられる」（My棚の myPrompt）の 2 点。
 * - 呼び出し側は `await` で書けること。既存実装が Promise を返していたのに合わせる。
 *
 * 【実装方針】ネイティブ <dialog> を使う。
 *   フォーカストラップ・Esc・背面の不活性化が標準で付いてくるので、
 *   自前で書くより確実。既存アプリはこれらを実装しておらず、
 *   モーダル表示中に背後のボタンへ Tab で到達できる状態だった。
 */

type ButtonSpec = {
  /** 呼び出し側が受け取る値。Esc / 背景クリックは常に null。 */
  value: string
  label: string
  /** 主ボタン（Enter で選ばれる／強調表示） */
  primary?: boolean
  /** 破壊的操作（赤系で表示） */
  danger?: boolean
}

type DialogRequest = {
  title: string
  message?: ReactNode
  buttons: ButtonSpec[]
  /** 指定すると入力欄が出る。戻り値は入力文字列。 */
  input?: { initial?: string; placeholder?: string }
}

type DialogApi = {
  /** 任意ボタン。押されたボタンの value を返す。Esc / 背景クリックは null。 */
  open: (req: DialogRequest) => Promise<string | null>
  /** はい/いいえ。true / false を返す。 */
  confirm: (
    title: string,
    message?: ReactNode,
    opts?: { okLabel?: string; danger?: boolean }
  ) => Promise<boolean>
  /** 入力を受ける。入力文字列、キャンセルなら null。 */
  prompt: (
    title: string,
    opts?: { initial?: string; placeholder?: string; message?: ReactNode }
  ) => Promise<string | null>
}

const DialogContext = createContext<DialogApi | null>(null)

type Pending = {
  req: DialogRequest
  resolve: (value: string | null) => void
}

export function DialogProvider({ children }: { children: ReactNode }): JSX.Element {
  const [pending, setPending] = useState<Pending | null>(null)
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // pending が付いたら showModal する。JSX の open 属性では
  // モーダル扱いにならない（＝フォーカストラップが効かない）ので命令的に開く。
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (pending && !el.open) {
      el.showModal()
      inputRef.current?.select()
    } else if (!pending && el.open) {
      el.close()
    }
  }, [pending])

  // 現在の pending を更新関数の外から読むための写し。
  // resolve は副作用なので setPending の更新関数の中では呼ばない
  // （StrictMode が更新関数を 2 回呼ぶため）。
  const latest = useRef<Pending | null>(null)
  latest.current = pending

  const settle = useCallback((value: string | null) => {
    const cur = latest.current
    latest.current = null
    setPending(null)
    cur?.resolve(value)
  }, [])

  /**
   * Esc は <dialog> の cancel イベントで来るが、**React 18 は cancel / close を
   * 合成イベント化していない**（対応は React 19 から）。onCancel 属性では
   * 発火しないので、ネイティブのリスナを直に張る。
   */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onCancel = (e: Event): void => {
      e.preventDefault() // 既定の close を止め、Promise の決着と一緒に閉じる
      settle(null)
    }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [settle])

  const open = useCallback(
    (req: DialogRequest) =>
      new Promise<string | null>((resolve) => {
        // 既に開いていたら、前のものはキャンセル扱いで決着させる
        // （呼び出し側の await が永久に残らないように）
        latest.current?.resolve(null)
        const next = { req, resolve }
        latest.current = next
        setPending(next)
      }),
    []
  )

  const api = useRef<DialogApi>({
    open,
    confirm: (title, message, opts) =>
      open({
        title,
        message,
        buttons: [
          { value: 'cancel', label: 'やめる' },
          {
            value: 'ok',
            label: opts?.okLabel ?? 'OK',
            primary: true,
            danger: opts?.danger
          }
        ]
      }).then((v) => v === 'ok'),
    prompt: (title, opts) =>
      open({
        title,
        message: opts?.message,
        input: { initial: opts?.initial, placeholder: opts?.placeholder },
        buttons: [
          { value: 'cancel', label: 'やめる' },
          { value: 'ok', label: 'OK', primary: true }
        ]
      })
  }).current

  const req = pending?.req

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!req) return
    const primary = req.buttons.find((b) => b.primary) ?? req.buttons[req.buttons.length - 1]
    settle(resultFor(primary))
  }

  function resultFor(button: ButtonSpec): string | null {
    if (button.value === 'cancel') return null
    // 入力ありの時は入力値を返す（ボタン名ではなく）
    if (req?.input && button.primary) return inputRef.current?.value ?? ''
    return button.value
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      <dialog
        ref={ref}
        className="dialog"
        // Esc の処理は上の useEffect でネイティブに張っている（React 18 では
        // onCancel が発火しないため）。
        // 背景クリック（<dialog> 自身が背景、中身は .dialog__panel）
        onMouseDown={(e) => {
          if (e.target === ref.current) settle(null)
        }}
      >
        {req && (
          <form className="dialog__panel" onSubmit={submit}>
            <h3 className="dialog__title">{req.title}</h3>
            {req.message && <div className="dialog__message">{req.message}</div>}
            {req.input && (
              <input
                ref={inputRef}
                className="dialog__input"
                defaultValue={req.input.initial ?? ''}
                placeholder={req.input.placeholder}
                autoFocus
              />
            )}
            <div className="ak-layout-inline dialog__buttons">
              {req.buttons.map((b) => (
                <button
                  key={b.value}
                  type={b.primary ? 'submit' : 'button'}
                  className={
                    'dialog__button' +
                    (b.primary ? ' is-primary' : '') +
                    (b.danger ? ' is-danger' : '')
                  }
                  onClick={b.primary ? undefined : () => settle(resultFor(b))}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </form>
        )}
      </dialog>
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog は DialogProvider の内側で使うこと')
  return ctx
}
