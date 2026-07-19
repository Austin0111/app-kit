import type { ReactNode } from 'react'
import { ToastProvider } from './toast'
import { DialogProvider } from './dialog'

/**
 * UI 部品のプロバイダをまとめたもの。
 * 使う側はこれ 1 つを root に置けばよい。
 */
export function UiProvider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ToastProvider>
      <DialogProvider>{children}</DialogProvider>
    </ToastProvider>
  )
}
