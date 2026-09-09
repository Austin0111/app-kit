import { expect, test } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { launchApp } from './helpers'
import { sql } from 'drizzle-orm'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'

test('DrizzleはSQLite識別子内の引用符を二重化してSQL構造から出さない', () => {
  const dialect = new SQLiteSyncDialect()
  expect(dialect.escapeName('safe_column')).toBe('"safe_column"')
  expect(dialect.escapeName('name" UNION SELECT secret FROM secrets --')).toBe(
    '"name"" UNION SELECT secret FROM secrets --"'
  )
  expect(dialect.escapeName('x"; DROP TABLE notes; --')).toBe(
    '"x""; DROP TABLE notes; --"'
  )
  expect(
    dialect.sqlToQuery(sql`${sql.identifier('name" UNION SELECT secret FROM secrets --')}`).sql
  ).toBe('"name"" UNION SELECT secret FROM secrets --"')
})

test('ログ本文・context・開発consoleの全出口で秘密を伏せる', async () => {
  const ctx = await launchApp()
  try {
    const consoleLines: string[] = []
    ctx.app.process().stdout?.on('data', (chunk) => consoleLines.push(String(chunk)))
    ctx.app.process().stderr?.on('data', (chunk) => consoleLines.push(String(chunk)))

    await ctx.page.evaluate(() =>
      window.api.log.write(
        'warn',
        'request failed: https://example.test/?token=message-secret Bearer bearer-secret',
        { authorization: 'context-secret', url: 'https://user:basic-secret@example.test/path' }
      )
    )
    await expect.poll(() => consoleLines.join('')).toContain('request failed')

    const jsonl = readFileSync(join(ctx.userDataDir, 'logs', 'app.jsonl'), 'utf8')
    const errors = readFileSync(join(ctx.userDataDir, 'logs', 'error.log'), 'utf8')
    const all = jsonl + errors + consoleLines.join('')
    for (const secret of ['message-secret', 'bearer-secret', 'context-secret', 'basic-secret']) {
      expect(all).not.toContain(secret)
    }
    expect(all).toContain('***')
  } finally {
    await ctx.close()
  }
})

test('BrowserWindowはsandbox化され、外部遷移とpopupを拒否する', async () => {
  const ctx = await launchApp()
  try {
    const sandbox = await ctx.app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.webContents.getLastWebPreferences().sandbox
    )
    expect(sandbox).toBe(true)
    const focused = await ctx.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().some((win) => win.isFocused())
    )
    expect(focused).toBe(false)
    const placement = await ctx.app.evaluate(({ BrowserWindow, screen }) => {
      const bounds = BrowserWindow.getAllWindows()[0]?.getBounds()
      const workArea = [...screen.getAllDisplays()].sort(
        (a, b) => a.workArea.x - b.workArea.x || a.workArea.y - b.workArea.y
      )[0]?.workArea
      return { bounds, workArea }
    })
    expect(placement.bounds).toBeDefined()
    expect(placement.workArea).toBeDefined()
    expect(placement.bounds!.x).toBeGreaterThanOrEqual(placement.workArea!.x)
    expect(placement.bounds!.y).toBeGreaterThanOrEqual(placement.workArea!.y)
    expect(placement.bounds!.x + placement.bounds!.width).toBeLessThanOrEqual(
      placement.workArea!.x + placement.workArea!.width
    )
    expect(placement.bounds!.y + placement.bounds!.height).toBeLessThanOrEqual(
      placement.workArea!.y + placement.workArea!.height
    )

    const before = ctx.page.url()
    await ctx.page.evaluate(() => {
      window.open('https://example.test/', '_blank')
      location.href = 'https://example.test/'
    })
    await ctx.page.waitForTimeout(200)
    expect(ctx.app.windows()).toHaveLength(1)
    expect(ctx.page.url()).toBe(before)
  } finally {
    await ctx.close()
  }
})

test('main境界で不正な設定・ID・秘密項目名を拒否する', async () => {
  const ctx = await launchApp()
  try {
    const errors = await ctx.page.evaluate(async () => {
      const capture = async (work: () => Promise<unknown>): Promise<string> => {
        try {
          await work()
          return ''
        } catch (error) {
          return String(error)
        }
      }
      return Promise.all([
        capture(() => window.api.settings.setMany({ theme: 'sepia' } as never)),
        capture(() => window.api.notes.remove(-1)),
        capture(() => window.api.secrets.status('../escape'))
      ])
    })
    expect(errors.every((error) => error.includes('Error invoking remote method'))).toBe(true)
  } finally {
    await ctx.close()
  }
})
