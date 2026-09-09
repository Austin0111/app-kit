import { expect, test } from '@playwright/test'
import { appendFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { launchApp } from './helpers'

function readStoredZip(path: string): Map<string, string> {
  const zip = readFileSync(path)
  const entries = new Map<string, string>()
  let offset = 0
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const method = zip.readUInt16LE(offset + 8)
    const size = zip.readUInt32LE(offset + 22)
    const nameLength = zip.readUInt16LE(offset + 26)
    const extraLength = zip.readUInt16LE(offset + 28)
    expect(method).toBe(0)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLength + extraLength
    const name = zip.subarray(nameStart, nameStart + nameLength).toString('utf8')
    entries.set(name, zip.subarray(dataStart, dataStart + size).toString('utf8'))
    offset = dataStart + size
  }
  return entries
}

test('診断ZIPは固定allowlistだけを含み、秘密・設定値・ローカルパスを除く', async () => {
  const ctx = await launchApp()
  try {
    await ctx.page.evaluate(async () => {
      await window.api.settings.setMany({ accentColor: '#123456' })
      await window.api.secrets.set('demoApiKey', 'diagnostic-secret')
    })
    appendFileSync(
      join(ctx.userDataDir, 'logs', 'app.jsonl'),
      `${JSON.stringify({ level: 'error', context: { password: 'json-secret', path: ctx.userDataDir } })}\n`
    )
    appendFileSync(
      join(ctx.userDataDir, 'logs', 'error.log'),
      `token=human-secret\npassword : line-secret\nAuthorization: Bearer auth-secret\npath=${ctx.userDataDir}\n`
    )

    const name = await ctx.page.evaluate(() => window.api.diagnostics.create())
    const entries = readStoredZip(join(ctx.userDataDir, 'diagnostics', name))
    expect([...entries.keys()].sort()).toEqual([
      'logs/app.jsonl',
      'logs/error.log',
      'settings-shape.json',
      'summary.json'
    ])

    const combined = [...entries.values()].join('\n')
    for (const secret of [
      'diagnostic-secret',
      'json-secret',
      'human-secret',
      'line-secret',
      'auth-secret',
      '#123456',
      ctx.userDataDir
    ]) {
      expect(combined).not.toContain(secret)
    }
    expect(combined).toContain('***')
    expect(combined).toContain('[userData]')

    const shape = JSON.parse(entries.get('settings-shape.json') ?? '{}')
    expect(shape.accentColor).toBe('string')
    const summary = JSON.parse(entries.get('summary.json') ?? '{}')
    expect(summary.databaseHealth).toEqual([{ quick_check: 'ok' }])
    expect(summary.runtime.electron).toBeTruthy()
  } finally {
    await ctx.close()
  }
})
