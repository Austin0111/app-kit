import { expect, test } from '@playwright/test'
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { tmpdir } from 'os'
import { launchApp } from './helpers'

test('復元元を検証し、正常なバックアップだけを次回起動時に適用する', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'e2e-backup-'))
  const first = await launchApp({ userDataDir, removeUserDataOnClose: false })
  let second: Awaited<ReturnType<typeof launchApp>> | null = null
  try {
    await first.page.evaluate(() => window.api.notes.add('バックアップ時点'))
    const backupPath = await first.page.evaluate(() => window.api.backup.create())
    await first.page.evaluate(() => window.api.notes.add('復元後には消える'))

    const outsidePath = join(userDataDir, 'outside.db')
    copyFileSync(backupPath, outsidePath)
    await expect(first.page.evaluate((path) => window.api.backup.restore(path), outsidePath)).rejects.toThrow()

    const corruptPath = join(dirname(backupPath), basename(backupPath).replace(/\.db$/, '_corrupt.db'))
    writeFileSync(corruptPath, 'not a sqlite database')
    await expect(first.page.evaluate((path) => window.api.backup.restore(path), corruptPath)).rejects.toThrow()

    await expect(first.page.evaluate((path) => window.api.backup.restore(path), backupPath)).resolves.toBe(true)
    await first.close()

    second = await launchApp({ userDataDir, removeUserDataOnClose: true })
    const notes = await second.page.evaluate(() => window.api.notes.list())
    expect(notes.map((note) => note.body)).toEqual(['バックアップ時点'])
  } finally {
    if (second) await second.close()
    else {
      try {
        await first.close()
      } catch {
        // 既に閉じていても後始末を続ける
      }
      rmSync(userDataDir, { recursive: true, force: true })
    }
  }
})
