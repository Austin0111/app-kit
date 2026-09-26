import { expect, test } from '@playwright/test'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { launchApp } from './helpers'

test('バックアップ一覧は自動作成・空・項目あり・取得失敗を区別する', async () => {
  const ctx = await launchApp()
  const dir = join(ctx.userDataDir, 'backups')
  const savedDir = join(ctx.userDataDir, 'backups-test-saved')
  try {
    const { page } = ctx
    await expect(page.getByRole('heading', { name: 'バックアップ（1世代）' })).toBeVisible()
    await expect(page.getByText('まだバックアップがありません')).toHaveCount(0)

    await page.evaluate(() => window.api.settings.setMany({ backupIntervalDays: 0 }))
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.db')) rmSync(join(dir, name))
    }
    await page.reload()
    await expect(page.getByRole('heading', { name: 'バックアップ（0世代）' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'まだバックアップがありません' })).toContainText('今すぐバックアップ')
    await page.setViewportSize({ width: 640, height: 720 })
    await page.locator('.app').evaluate((app) => { app.scrollTop = app.scrollHeight })
    mkdirSync(join('test-results', 'screenshots'), { recursive: true })
    await page.screenshot({ path: join('test-results', 'screenshots', 'backup-empty-narrow.png') })
    await page.getByRole('button', { name: '今すぐバックアップ' }).click()
    await expect(page.getByRole('heading', { name: 'バックアップ（1世代）' })).toBeVisible()
    await expect(page.getByText('まだバックアップがありません')).toHaveCount(0)

    renameSync(dir, savedDir)
    writeFileSync(dir, 'test-only obstruction')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'バックアップ（取得失敗）' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('バックアップ一覧を読み込めませんでした')
    await expect(page.getByText('まだバックアップがありません')).toHaveCount(0)
    expect(ctx.consoleErrors).toEqual([])
  } finally {
    if (existsSync(savedDir)) {
      if (existsSync(dir)) rmSync(dir)
      renameSync(savedDir, dir)
    }
    await ctx.close()
  }
})
