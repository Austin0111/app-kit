import { expect, test } from '@playwright/test'
import { ALL_INVOKE_CHANNELS } from '../src/shared/ipc-channels'
import { launchApp } from './helpers'

test('preloadの公開APIに対応するmain handlerがすべて登録される', async () => {
  const ctx = await launchApp()
  try {
    const registered = await ctx.page.evaluate(() => window.api.e2e.registeredIpcChannels())
    expect(registered).toEqual([...ALL_INVOKE_CHANNELS].sort())
  } finally {
    await ctx.close()
  }
})
