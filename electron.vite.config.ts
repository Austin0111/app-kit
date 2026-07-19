import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// main / preload は Node 側で動くので、依存を bundle せず external にする。
// better-sqlite3 のようなネイティブモジュールは bundle できないため、これが必須。
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
