import { expect, test } from '@playwright/test'
import { createServer } from 'vite'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { launchApp } from './helpers'

test('Galleryは通常/Reduced比較、Replay、初回画像契約を確認できる', async () => {
  const server = await createServer({ root: join(process.cwd(), 'src/renderer'), configFile: false, server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Gallery server did not start')
  const ctx = await launchApp()
  try {
    const windowPromise = ctx.app.waitForEvent('window')
    await ctx.app.evaluate(async ({ BrowserWindow }, url) => {
      const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } })
      await window.loadURL(url)
    }, `http://127.0.0.1:${address.port}/gallery.html`)
    const page = await windowPromise
    const galleryErrors: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') galleryErrors.push(message.text()) })
    page.on('pageerror', (error) => galleryErrors.push(String(error)))
    await expect(page.getByRole('heading', { name: 'Motion Gallery v1' })).toBeVisible()
    await expect(page.getByTestId('preview-normal')).toBeVisible()
    await expect(page.getByTestId('preview-reduced')).toBeVisible()
    mkdirSync(join('test-results', 'screenshots'), { recursive: true })
    await page.setViewportSize({ width: 1100, height: 850 })
    await page.screenshot({ path: join('test-results', 'screenshots', 'motion-gallery.png') })
    await page.setViewportSize({ width: 640, height: 780 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: join('test-results', 'screenshots', 'motion-gallery-narrow.png') })
    await page.setViewportSize({ width: 1100, height: 850 })
    await page.getByRole('button', { name: 'ToastEnterCompact' }).click()
    await expect(page.getByText('template src/renderer/src/index.css toast-in')).toBeVisible()
    await page.getByRole('button', { name: 'ToastRiseIn' }).click()
    await expect(page.getByText('VideoDeck renderer/styles/main.css toastIn')).toBeVisible()
    await expect(page.getByLabel('Toast比較').locator('.mg-toast-variant-grid > div')).toHaveCount(3)
    const normal = page.getByTestId('preview-normal').locator('.ak-motion-toast-rise-in')
    const reduced = page.getByTestId('preview-reduced').locator('.ak-motion-toast-rise-in')
    expect(await normal.evaluate((el) => getComputedStyle(el).animationName)).toBe('ak-motion-toast-rise-in')
    expect(await reduced.evaluate((el) => getComputedStyle(el).animationName)).toBe('ak-motion-fade-in')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await normal.evaluate((el) => getComputedStyle(el).animationName)).toBe('ak-motion-toast-rise-in')
    expect(await reduced.evaluate((el) => getComputedStyle(el).animationName)).toBe('ak-motion-fade-in')
    await page.getByRole('button', { name: 'Replay both' }).click()
    await expect(page.getByTestId('preview-normal').locator('.ak-motion-toast-rise-in')).toBeVisible()
    await page.getByRole('button', { name: 'ImageFirstPaintFade' }).click()
    const image = page.getByTestId('preview-normal').getByRole('img', { name: '初回表示のサンプル' })
    await expect(image).toBeVisible()
    await page.waitForTimeout(350)
    await page.getByTestId('preview-normal').getByRole('button', { name: /再描画/ }).click()
    await expect(image).not.toHaveClass(/is-animating/)
    expect(ctx.consoleErrors).toEqual([])
    expect(galleryErrors).toEqual([])
  } finally {
    await ctx.close()
    await server.close()
  }
})
