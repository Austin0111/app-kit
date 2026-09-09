import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { launchApp } from './helpers'
import { runElectronProcess } from './process-helper'

test('Electron固有の致命障害を共通ログへ記録する', async () => {
  const ctx = await launchApp()
  try {
    for (const kind of ['child', 'unresponsive', 'load'] as const) {
      await ctx.page.evaluate((value) => window.api.e2e.simulateElectronFailure(value), kind)
    }
    await ctx.page.evaluate(() => window.api.e2e.simulateElectronFailure('renderer'))
    await ctx.page.waitForSelector('.titlebar')

    const errorLog = readFileSync(join(ctx.userDataDir, 'logs', 'error.log'), 'utf8')
    expect(errorLog).toContain('render-process-gone')
    expect(errorLog).toContain('child-process-gone')
    expect(errorLog).toContain('unresponsive')
    expect(errorLog).toContain('did-fail-load')
    expect(errorLog).not.toContain('load-secret')
    expect(errorLog).toMatch(/終了コード\s+: 99/)
    expect(errorLog).toMatch(/終了コード\s+: 98/)
  } finally {
    await ctx.close()
  }
})

test('renderer停止は再読込し、短時間に繰り返すとループを止める', async () => {
  const ctx = await launchApp()
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      await ctx.page.evaluate(() => window.api.e2e.simulateElectronFailure('renderer'))
      await ctx.page.waitForTimeout(150)
      await ctx.page.waitForSelector('.titlebar')
      const state = await ctx.page.evaluate(() => window.api.e2e.recoveryState())
      expect(state).toEqual({ reloadCount: attempt, lastAction: 'reload' })
    }

    await ctx.page.evaluate(() => window.api.e2e.simulateElectronFailure('renderer'))
    await ctx.page.waitForTimeout(50)
    const state = await ctx.page.evaluate(() => window.api.e2e.recoveryState())
    expect(state).toEqual({ reloadCount: 2, lastAction: 'limit' })
  } finally {
    await ctx.close()
  }
})

test('mainの未処理例外は秘密を伏せて記録し、異常終了する', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'e2e-fatal-main-'))
  try {
    const result = await runElectronProcess({
      APP_USER_DATA_DIR: userDataDir,
      APP_E2E_FATAL_MAIN: '1'
    })
    expect(result.code).not.toBe(0)
    const errorLog = readFileSync(join(userDataDir, 'logs', 'error.log'), 'utf8')
    expect(errorLog).toContain('uncaughtException')
    expect(errorLog).not.toContain('fatal-secret')
    expect(errorLog).toContain('token=***')
  } finally {
    rmSync(userDataDir, { recursive: true, force: true })
  }
})
