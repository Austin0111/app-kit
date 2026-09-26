import { expect, test } from '@playwright/test'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { join } from 'path'
import { mkdirSync, readFileSync } from 'fs'
import { launchApp } from './helpers'

test('開発画面のDesign Systemから既存Motion Galleryを開ける', async () => {
  const server = await createServer({
    root: join(process.cwd(), 'src/renderer'),
    configFile: false,
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
    server: { host: '127.0.0.1', port: 0 }
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('開発画面サーバーを起動できなかった')
  const rendererUrl = `http://127.0.0.1:${address.port}/`
  let ctx: Awaited<ReturnType<typeof launchApp>> | undefined
  try {
    ctx = await launchApp({ rendererUrl })
    const page = ctx.page
    const errors: string[] = []
    const popupPromise = ctx.app.waitForEvent('window')
    await expect(page.getByRole('heading', { name: 'デザインシステム' })).toBeVisible()
    await page.getByRole('link', { name: '動きの見本帳（Motion Gallery）を開く' }).click()
    const gallery = await popupPromise
    gallery.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    gallery.on('pageerror', (error) => errors.push(String(error)))
    await expect(gallery.getByRole('heading', { name: '動きの見本帳' })).toBeVisible()
    expect(new URL(gallery.url()).pathname).toBe('/gallery.html')
    expect(await gallery.evaluate(() => 'api' in window)).toBe(false)
    await gallery.setViewportSize({ width: 1000, height: 800 })
    mkdirSync(join('test-results', 'screenshots'), { recursive: true })
    await page.screenshot({ path: join('test-results', 'screenshots', 'design-system-entry.png') })
    await page.setViewportSize({ width: 640, height: 720 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: join('test-results', 'screenshots', 'design-system-entry-narrow.png') })
    await gallery.screenshot({ path: join('test-results', 'screenshots', 'design-system-gallery.png') })
    await gallery.setViewportSize({ width: 640, height: 780 })
    expect(await gallery.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await gallery.screenshot({ path: join('test-results', 'screenshots', 'design-system-gallery-narrow.png') })
    const componentPopup = ctx.app.waitForEvent('window')
    await page.getByRole('link', { name: '標準Componentの見本帳を開く' }).click()
    const componentGallery = await componentPopup
    componentGallery.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    componentGallery.on('pageerror', (error) => errors.push(String(error)))
    await expect(componentGallery.getByRole('heading', { name: '標準Componentの見本帳' })).toBeVisible()
    expect(new URL(componentGallery.url()).pathname).toBe('/component-gallery.html')
    expect(await componentGallery.evaluate(() => 'api' in window)).toBe(false)
    const foundationPopup = ctx.app.waitForEvent('window')
    await page.getByRole('link', { name: '標準Foundationの見本帳を開く' }).click()
    const foundationGallery = await foundationPopup
    foundationGallery.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    foundationGallery.on('pageerror', (error) => errors.push(String(error)))
    await expect(foundationGallery.getByRole('heading', { name: '標準Foundationの見本帳' })).toBeVisible()
    expect(new URL(foundationGallery.url()).pathname).toBe('/foundation-gallery.html')
    expect(await foundationGallery.evaluate(() => 'api' in window)).toBe(false)
    await expect(foundationGallery.getByText('--ak-foundation-radius-control', { exact: true })).toBeVisible()
    expect(await foundationGallery.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ak-foundation-radius-control').trim())).toBe('6px')
    const focusSample = foundationGallery.getByRole('button', { name: 'Tabでフォーカスを確認' }).first()
    await focusSample.focus()
    await foundationGallery.keyboard.press('Shift+Tab')
    await foundationGallery.keyboard.press('Tab')
    await expect(focusSample).toBeFocused()
    expect(await focusSample.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('2px')
    await foundationGallery.emulateMedia({ reducedMotion: 'reduce' })
    expect(await focusSample.evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
    await foundationGallery.setViewportSize({ width: 1100, height: 850 })
    await foundationGallery.screenshot({ path: join('test-results', 'screenshots', 'foundation-gallery.png'), fullPage: true })
    await foundationGallery.setViewportSize({ width: 640, height: 780 })
    expect(await foundationGallery.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await foundationGallery.screenshot({ path: join('test-results', 'screenshots', 'foundation-gallery-narrow.png'), fullPage: true })
    expect(ctx.consoleErrors).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await ctx?.close()
    await server.close()
  }
})

test('通常ビルドの画面には開発用入口を表示しない', async () => {
  const ctx = await launchApp()
  try {
    await expect(ctx.page.getByRole('heading', { name: 'デザインシステム' })).toHaveCount(0)
    await expect(ctx.page.getByRole('link', { name: '動きの見本帳（Motion Gallery）を開く' })).toHaveCount(0)
    await expect(ctx.page.getByRole('link', { name: '標準Componentの見本帳を開く' })).toHaveCount(0)
    await expect(ctx.page.getByRole('link', { name: '標準Foundationの見本帳を開く' })).toHaveCount(0)
    expect(ctx.consoleErrors).toEqual([])
  } finally {
    await ctx.close()
  }
})
