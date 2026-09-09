import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { spawnSync } from 'child_process'

const root = process.cwd()
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('npm経由で実行してほしい: npm run release:verify')

function run(script) {
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('verify')
run('dist')
run('test:packaged')
run('test:installer')
// Playwrightは実行ごとにtest-resultsを初期化する。配布版テストの後に
// 目視素材を再生成し、release:verify完了時にもスクリーンショットを残す。
run('test:screenshots')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version
const productName = pkg.build.productName
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const latest = readFileSync(join(root, 'dist', 'latest.yml'), 'utf8')
const expected = [
  join(root, 'dist', `${productName} Setup ${version}.exe`),
  join(root, 'dist', 'win-unpacked', `${productName}.exe`)
]

if (!changelog.includes(`## [${version}]`)) {
  throw new Error(`CHANGELOG.md に現行版 ${version} の項目がない`)
}
if (!new RegExp(`^version:\\s*${version.replace(/\./g, '\\.')}\\s*$`, 'm').test(latest)) {
  throw new Error(`dist/latest.yml の版が package.json (${version}) と一致しない`)
}
for (const path of expected) {
  if (!existsSync(path)) throw new Error(`配布成果物が見つからない: ${path}`)
}

console.log(`release:verify PASS: ${productName} ${version}`)
