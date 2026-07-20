import type { ReactNode } from 'react'
import { ToastProvider } from './toast'
import { DialogProvider } from './dialog'
import { ErrorBoundary } from './ErrorBoundary'

/**
 * UI 部品のプロバイダをまとめたもの。
 * 使う側はこれ 1 つを root に置けばよい。
 */
export function UiProvider({ children }: { children: ReactNode }): JSX.Element {
  // ErrorBoundary は一番外に置く。中の描画が失敗しても受け止められるように。
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DialogProvider>{children}</DialogProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
