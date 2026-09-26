import { expect, test } from '@playwright/test'
import { execFileSync, spawnSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'fs'
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
    expect(existsSync(join(target, 'src/renderer/foundation-gallery.html'))).toBe(false)
    expect(existsSync(join(target, 'src/renderer/foundation-gallery'))).toBe(false)
    for (const relative of [
      'src/renderer/src/ui/component-registry.ts', 'scripts/create-app.mjs',
      'tests/component-gallery.spec.ts', 'tests/motion-gallery.spec.ts',
      'tests/design-system-entry.spec.ts', 'tests/generator.spec.ts',
      'docs/settings-interactions.md', 'docs/maintenance.md', 'test-results'
    ]) expect(existsSync(join(target, relative))).toBe(false)
    expect(existsSync(join(target, 'src/renderer/src/ui/TextField.tsx'))).toBe(true)
    expect(existsSync(join(target, 'src/renderer/src/ui/EmptyState.tsx'))).toBe(true)
    expect(readFileSync(join(target, 'src/renderer/src/foundation/tokens.css'), 'utf8')).toContain('--ak-foundation-radius-control')
    expect(readFileSync(join(target, 'src/renderer/src/main.tsx'), 'utf8')).toContain("import './foundation/tokens.css'")
    expect(readFileSync(join(target, 'src/renderer/src/ui/components.css'), 'utf8')).toContain('.ak-ui-text-field__input')
    expect(readFileSync(join(target, 'src/renderer/src/ui/components.css'), 'utf8')).toContain('.ak-ui-empty-state')
    expect(readFileSync(join(target, 'src/shared/app-meta.ts'), 'utf8')).toContain('export const IS_TEMPLATE = false')
    expect(readFileSync(join(target, 'src/renderer/src/App.tsx'), 'utf8')).not.toContain('component-gallery.html')
    expect(readFileSync(join(target, 'src/main/index.ts'), 'utf8')).not.toContain('APP_KIT_GALLERY_WINDOW_START')
    expect(existsSync(join(target, 'src/renderer/src/index.css'))).toBe(false)
    expect(existsSync(join(target, 'src/renderer/src/dev'))).toBe(false)
    expect(readFileSync(join(target, 'src/renderer/src/main.tsx'), 'utf8')).not.toContain('design-system.css')
    expect(readFileSync(join(target, 'src/renderer/src/base.css'), 'utf8')).not.toContain('overflow: hidden')
    const starterCss = readFileSync(join(target, 'src/renderer/src/starter.css'), 'utf8')
    expect(starterCss).toContain('.app__content > section')
    expect(starterCss).not.toMatch(/^(?:button|input|section|ul|li|h1|h2)\s*\{/m)
    expect(readFileSync(join(target, 'src/renderer/src/layout/inline.css'), 'utf8')).toContain('.ak-layout-inline')
    expect(readFileSync(join(target, 'src/renderer/src/ui/chrome.css'), 'utf8')).toContain('.dialog__panel')
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
    expect(reviewDoc).not.toContain('component-gallery.html')
    const instructions = readFileSync(join(target, 'AGENTS.md'), 'utf8')
    for (const principle of ['ui-components.md', 'ui-foundations.md', 'ui-layout.md', 'ui-motion.md', 'ui-design-review.md', 'Reduced Motion', 'Media Safe', '実需要', 'starter画面']) {
      expect(instructions).toContain(principle)
    }
    expect(instructions).not.toContain('Codex へ移行した `app-kit`')
    expect(readFileSync(join(target, 'CLAUDE.md'), 'utf8')).toContain('[AGENTS.md](AGENTS.md)')
    for (const relative of ['docs/ui-components.md', 'docs/ui-foundations.md', 'docs/ui-motion.md']) {
      expect(readFileSync(join(target, relative), 'utf8')).not.toContain('npm run gallery')
    }

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

test('生成元の必須ファイルが欠けたら不完全なアプリを成功扱いしない', () => {
  const root = process.cwd()
  const holder = mkdtempSync(join(tmpdir(), 'app-kit-generator-failure-'))
  const fixtureScripts = join(holder, 'fixture', 'scripts')
  mkdirSync(fixtureScripts, { recursive: true })
  copyFileSync(join(root, 'scripts', 'create-app.mjs'), join(fixtureScripts, 'create-app.mjs'))
  try {
    const result = spawnSync(process.execPath, [join(fixtureScripts, 'create-app.mjs'), 'missing-source', '--dir', join(holder, 'output')], {
      cwd: root, encoding: 'utf8'
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('必須ファイルが見つからない: src/shared/app-meta.ts')
  } finally {
    rmSync(holder, { recursive: true, force: true })
  }
})
