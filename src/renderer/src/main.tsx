import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { UiProvider } from './ui'
import { DISPLAY_NAME } from '../../shared/app-meta'
import './index.css'

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
