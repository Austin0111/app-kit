import { expect, test } from '@playwright/test'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { launchApp } from './helpers'
import { runElectronProcess } from './process-helper'

test('マイグレーション失敗時は直前バックアップを残し、既存データを壊さない', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'e2e-migration-'))
  const first = await launchApp({ userDataDir, removeUserDataOnClose: false })
  let second: Awaited<ReturnType<typeof launchApp>> | null = null
  try {
    await first.page.evaluate(() => window.api.notes.add('移行前のデータ'))
    await first.close()

    const failed = await runElectronProcess({
      APP_USER_DATA_DIR: userDataDir,
      APP_E2E_FAIL_MIGRATION: '1'
    })
    expect(failed.code).not.toBe(0)

    const backups = readdirSync(join(userDataDir, 'backups')).filter((name) =>
      name.startsWith('pre_migration_')
    )
    expect(backups).toHaveLength(1)
    const errorLog = readFileSync(join(userDataDir, 'logs', 'error.log'), 'utf8')
    expect(errorLog).toContain('データベース更新に失敗した')
    expect(errorLog).toContain(backups[0])

    second = await launchApp({ userDataDir, removeUserDataOnClose: false })
    const notes = await second.page.evaluate(() => window.api.notes.list())
    expect(notes.map((note) => note.body)).toContain('移行前のデータ')
  } finally {
    if (second) await second.close()
    else {
      try {
        await first.close()
      } catch {
        // 既に閉じていても後始末を続ける
      }
    }
    rmSync(userDataDir, { recursive: true, force: true })
  }
})
