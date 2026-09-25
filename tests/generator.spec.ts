import { expect, test } from '@playwright/test'
import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

test('生成した派生アプリが名前整合・型検査・DB生成・buildを通る', () => {
  const root = process.cwd()
  const holder = mkdtempSync(join(tmpdir(), 'app-kit-generated-'))
  const target = join(holder, 'generated-smoke')

  try {
    execFileSync(
      process.execPath,
      [join(root, 'scripts', 'create-app.mjs'), 'generated-smoke', '--display', '生成確認', '--dir', target],
      { cwd: root, stdio: 'pipe' }
    )

    const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
    const lock = JSON.parse(readFileSync(join(target, 'package-lock.json'), 'utf8'))
    expect(pkg).toMatchObject({ name: 'generated-smoke', version: '0.1.0' })
    expect(lock).toMatchObject({ name: 'generated-smoke', version: '0.1.0' })
    expect(lock.packages['']).toMatchObject({ name: 'generated-smoke', version: '0.1.0' })
    expect(pkg.scripts.gallery).toBeUndefined()
    expect(existsSync(join(target, 'src/renderer/gallery.html'))).toBe(false)
    expect(existsSync(join(target, 'src/renderer/gallery'))).toBe(false)
    expect(existsSync(join(target, 'src/renderer/component-gallery.html'))).toBe(false)
    expect(existsSync(join(target, 'src/renderer/component-gallery'))).toBe(false)
    expect(readFileSync(join(target, 'src/shared/app-meta.ts'), 'utf8')).toContain('export const IS_TEMPLATE = false')
    expect(existsSync(join(target, 'src/renderer/src/motion/presets.css'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/motion/registry.ts'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/ui/Accordion.tsx'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/ui/Toggle.tsx'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/ui/Panel.tsx'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/ui/Card.tsx'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/ui/Button.tsx'))).toBe(true)
    expect(readFileSync(join(target, 'src/renderer/src/ui/index.ts'), 'utf8')).toContain("export { Button, IconButton }")
    expect(readFileSync(join(target, 'src/renderer/src/ui/components.css'), 'utf8')).toContain('.ak-ui-button--primary')
    expect(existsSync(join(target, 'src/renderer/src/ui/components.css'))).toBe(true)
    const reviewDoc = readFileSync(join(target, 'docs/ui-design-review.md'), 'utf8')
    expect(reviewDoc).toContain('生成確認専用Review File')
    expect(reviewDoc).not.toContain('AAJ0mwevHzAmjBHv9W20ok')
    expect(reviewDoc).not.toContain('Proofline App Kit - Design Review')

    // 依存導入そのものではなく生成物を検査する。既存node_modulesをjunctionで共有し、
    // npm installによるネットワーク・lockfile書換え・native rebuildを試験から排除する。
    symlinkSync(join(root, 'node_modules'), join(target, 'node_modules'), 'junction')

    execFileSync(process.execPath, [join(target, 'scripts', 'check-names.mjs')], {
      cwd: target,
      stdio: 'pipe'
    })
    execFileSync(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc')], {
      cwd: target,
      stdio: 'pipe'
    })
    execFileSync(
      process.execPath,
      [join(root, 'node_modules', 'drizzle-kit', 'bin.cjs'), 'generate'],
      { cwd: target, stdio: 'pipe' }
    )
    const migrationDiff = execFileSync('git', ['status', '--short', '--', 'drizzle'], {
      cwd: target,
      encoding: 'utf8'
    })
    expect(migrationDiff).toBe('')
    execFileSync(
      process.execPath,
      [join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js'), 'build'],
      { cwd: target, stdio: 'pipe' }
    )
  } finally {
    rmSync(holder, { recursive: true, force: true })
  }
})
