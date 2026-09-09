import { expect, test } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { launchApp } from './helpers'

test('Electron固有の致命障害を共通ログへ記録する', async () => {
  const ctx = await launchApp()
  try {
    for (const kind of ['renderer', 'child', 'unresponsive', 'load'] as const) {
      await ctx.page.evaluate((value) => window.api.e2e.simulateElectronFailure(value), kind)
    }

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
