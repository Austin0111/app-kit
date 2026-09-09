import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
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

// electron-vite 5 は main / preload の依存を既定で external にする。
// better-sqlite3 のようなネイティブモジュールは bundle できないため、この既定を維持する。
export default defineConfig({
  main: {
    define
  },
  preload: {
    define
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
