import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * 版はビルド時に埋め込む。
 *
 * `app.getVersion()` は**起動のされ方で値が変わる**。
 * `electron out/main/index.js` のように直接起動すると、アプリの package.json を
 * 見つけられず **Electron 自身の版（33.x）を返す**。実際にそれで
 * 「v33.4.11」と表示され、更新比較も壊れていた。
 */
const APP_VERSION = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version
const define = { __APP_VERSION__: JSON.stringify(APP_VERSION) }

// main / preload は Node 側で動くので、依存を bundle せず external にする。
// better-sqlite3 のようなネイティブモジュールは bundle できないため、これが必須。
export default defineConfig({
  main: {
    define,
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    define,
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    define,
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
