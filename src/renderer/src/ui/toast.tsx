import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * トースト。棚卸しで 7 本すべてが独立に書いていた部品のひとつ。
 *
 * 既存実装の癖を踏まえた設計:
 * - My棚 / Prompt Builder は「2秒で消える」固定だったが、エラーは読み切れないことがある。
 *   → 種別ごとに既定の表示時間を変え、エラーは長めにする。
 * - 同じ操作を連打すると同じ文言が積み上がる問題があった。
 *   → 直前と同じ文言なら積まずにタイマーだけ延長する。
 */

export type ToastKind = 'info' | 'success' | 'error'

type Toast = {
  id: number
  kind: ToastKind
  message: string
}

type ToastApi = {
  show: (message: string, kind?: ToastKind) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DEFAULT_DURATION: Record<ToastKind, number> = {
  info: 2500,
  success: 2500,
  // エラーは読む時間が要るので長く出す
  error: 6000
}

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const seq = useRef(0)
  // 更新関数の外から現在値を読むための写し（重複判定に使う）
  const latest = useRef<Toast[]>([])
  latest.current = toasts

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /**
   * NOTE: タイマー登録や id 採番といった副作用を setToasts の更新関数の中で
   * やってはいけない。StrictMode は更新関数を 2 回呼ぶため、タイマーが二重に張られる。
   * 副作用はここ（イベントハンドラ側）で済ませ、更新関数は純粋に保つ。
   */
  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const duration = DEFAULT_DURATION[kind]

      // 直前と同じ文言なら積み増さず、タイマーだけ延長する
      const last = latest.current[latest.current.length - 1]
      if (last && last.message === message && last.kind === kind) {
        const timer = timers.current.get(last.id)
        if (timer) clearTimeout(timer)
        timers.current.set(
          last.id,
          setTimeout(() => dismiss(last.id), duration)
        )
        return
      }

      const id = ++seq.current
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      )
      setToasts((prev) => [...prev, { id, kind, message }])
    },
    [dismiss]
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error')
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} className={`toast toast--${t.kind}`} onClick={() => dismiss(t.id)}>
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast は ToastProvider の内側で使うこと')
  return ctx
}
