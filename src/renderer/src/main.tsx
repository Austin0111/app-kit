import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { UiProvider } from './ui'
import { DISPLAY_NAME } from '../../shared/app-meta'
import { installRendererErrorLogging } from './log'
import './base.css'
import './foundation/tokens.css'
import './motion/tokens.css'
import './motion/presets.css'
import './layout/inline.css'
import './ui/components.css'
import './ui/chrome.css'
import './starter.css'
// APP_KIT_DEVELOPMENT_STYLE_IMPORT_START
import './dev/design-system.css'
// APP_KIT_DEVELOPMENT_STYLE_IMPORT_END

// 画面側の例外を記録に残す（DevTools を開かないと分からない状態にしない）
installRendererErrorLogging()

// index.html の <title> は**ページ読み込み時に BrowserWindow の title を上書きする**。
// タスクバーや Alt+Tab に出る名前を表示名に揃えるため、ここで明示的に設定する。
// （main 側で title を指定するだけでは効かない）
document.title = DISPLAY_NAME

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UiProvider>
      <App />
    </UiProvider>
  </React.StrictMode>
)
