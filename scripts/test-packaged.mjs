import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const exe = join(root, 'dist', 'win-unpacked', `${pkg.build.productName}.exe`)

if (!existsSync(exe)) {
  console.error(`配布版が見つからない: ${exe}\n先に npm run dist を実行すること。`)
  process.exit(1)
}

const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js')
const result = spawnSync(
  process.execPath,
  [cli, 'test', 'tests/packaged.spec.ts', '--workers=1'],
  { cwd: root, env: { ...process.env, REQUIRE_PACKAGED: '1' }, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
