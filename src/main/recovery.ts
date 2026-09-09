import { app, BrowserWindow, dialog } from 'electron'
import { DISPLAY_NAME } from '../shared/app-meta'
import { log } from './log'

const WINDOW_MS = 60_000
const MAX_RELOADS = 2

type RecoveryAction = 'none' | 'reload' | 'wait' | 'exit' | 'limit'
type RecoveryState = {
  reloads: number[]
  lastAction: RecoveryAction
  promptOpen: boolean
}

const states = new WeakMap<BrowserWindow, RecoveryState>()

function stateFor(win: BrowserWindow): RecoveryState {
  const existing = states.get(win)
  if (existing) return existing
  const created: RecoveryState = { reloads: [], lastAction: 'none', promptOpen: false }
  states.set(win, created)
  return created
}

function recentReloads(state: RecoveryState): number[] {
  const threshold = Date.now() - WINDOW_MS
  state.reloads = state.reloads.filter((time) => time >= threshold)
  return state.reloads
}

function reloadWhenSafe(win: BrowserWindow, state: RecoveryState): void {
  state.reloads.push(Date.now())
  state.lastAction = 'reload'
  setTimeout(() => {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.reload()
  }, 0)
}

async function recoverRenderer(win: BrowserWindow): Promise<void> {
  const state = stateFor(win)
  if (state.promptOpen) return
  const reloads = recentReloads(state)

  if (reloads.length >= MAX_RELOADS) {
    state.lastAction = 'limit'
    log.error('rendererの再読込上限に達した', {
      種類: 'renderer-recovery-limit',
      回数: reloads.length,
      期間秒: WINDOW_MS / 1000
    })
    if (process.env.APP_E2E === '1') return

    state.promptOpen = true
    const result = await dialog
      .showMessageBox(win, {
        type: 'error',
        title: `${DISPLAY_NAME} の復旧を停止した`,
        message: '画面の停止が繰り返されたため、自動的な再読込を止めた。',
        detail: 'アプリを終了してから再度起動してほしい。記録はログに残っている。',
        buttons: ['終了する', 'このまま待つ'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      })
      .finally(() => (state.promptOpen = false))
    if (result.response === 0) {
      state.lastAction = 'exit'
      app.quit()
    }
    return
  }

  if (process.env.APP_E2E === '1') {
    const action = process.env.APP_E2E_RECOVERY_ACTION ?? 'reload'
    if (action === 'reload') reloadWhenSafe(win, state)
    else state.lastAction = 'wait'
    return
  }

  state.promptOpen = true
  const result = await dialog
    .showMessageBox(win, {
      type: 'error',
      title: `${DISPLAY_NAME} の画面が停止した`,
      message: '画面の処理が予期せず終了した。',
      detail: '保存済みデータはそのまま。画面を再読込するか、アプリを終了できる。',
      buttons: ['画面を再読込', '終了する'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    })
    .finally(() => (state.promptOpen = false))
  if (result.response === 0) reloadWhenSafe(win, state)
  else {
    state.lastAction = 'exit'
    app.quit()
  }
}

async function recoverUnresponsive(win: BrowserWindow): Promise<void> {
  const state = stateFor(win)
  if (state.promptOpen) return
  if (process.env.APP_E2E === '1') {
    state.lastAction = 'wait'
    return
  }

  state.promptOpen = true
  const result = await dialog
    .showMessageBox(win, {
      type: 'warning',
      title: `${DISPLAY_NAME} が応答していない`,
      message: '画面の応答に時間がかかっている。',
      detail: '処理を待つか、画面だけを再読込するか、アプリを終了できる。',
      buttons: ['待つ', '画面を再読込', '終了する'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    })
    .finally(() => (state.promptOpen = false))
  if (result.response === 1) reloadWhenSafe(win, state)
  else if (result.response === 2) {
    state.lastAction = 'exit'
    app.quit()
  } else state.lastAction = 'wait'
}

/** 1つのウィンドウへ、利用者が選べる復旧導線と再読込ループ防止を付ける。 */
export function installWindowRecovery(win: BrowserWindow): void {
  stateFor(win)
  win.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit' || details.reason === 'killed') return
    void recoverRenderer(win).catch((err) => log.error('rendererの復旧処理に失敗した', { 詳細: err }))
  })
  win.on('unresponsive', () => {
    void recoverUnresponsive(win).catch((err) => log.error('応答停止の復旧処理に失敗した', { 詳細: err }))
  })
}

/** E2E専用。実際に選ばれた復旧分岐を観測する。 */
export function getRecoveryState(win: BrowserWindow): { reloadCount: number; lastAction: RecoveryAction } {
  const state = stateFor(win)
  return { reloadCount: recentReloads(state).length, lastAction: state.lastAction }
}
