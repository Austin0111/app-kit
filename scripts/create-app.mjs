#!/usr/bin/env node
/**
 * この雛形から新しいアプリを作る。
 *
 *   node scripts/create-app.mjs <内部識別子> [--display "表示名"] [--dir <作成先>]
 *
 * 例:
 *   node scripts/create-app.mjs manga-shelf --display "漫画棚"
 *   → D:\ClaudeCode\manga-shelf が出来る
 *
 * やること:
 *   1. 雛形を複製（node_modules / out / dist / test-results / .git は除く）
 *   2. 名前の差し替え（app-meta.ts / package.json / update-check.ts / README ほか）
 *   3. CHANGELOG を初期化、版を 0.1.0 へ戻す
 *   4. git init して最初のコミット
 *
 * **依存の導入はしない。** 作成後に案内する3手順で、Electron本体と
 * native moduleを明示的に揃えること。
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync
} from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const TEMPLATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 複製しないもの。生成物と、雛形固有の履歴
const SKIP = new Set(['node_modules', 'out', 'dist', 'test-results', '.git'])
const DEVELOPMENT_ONLY = new Set([
  'src/renderer/gallery.html',
  'src/renderer/gallery'
])

// ---------------------------------------------------------------- 引数

const argv = process.argv.slice(2)
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  console.log(`使い方:
  node scripts/create-app.mjs <内部識別子> [--display "表示名"] [--dir <作成先>]

  <内部識別子>  英小文字・数字・ハイフンのみ。**後から変えられない**
                （userData フォルダ名・DB 名・バックアップ名に使う）
  --display     表示名。省略時は内部識別子と同じ。**後からいつでも変えられる**
  --dir         作成先。省略時は雛形と同じ階層に <内部識別子> で作る`)
  process.exit(0)
}

const internalName = argv[0]
const displayName = readOption('--display') ?? internalName
const targetDir = resolve(readOption('--dir') ?? join(TEMPLATE_ROOT, '..', internalName))

function readOption(name) {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null
}

// ---------------------------------------------------------------- 検査

// 内部識別子はフォルダ名・ファイル名になるので、素性の良い文字だけに限る
if (!/^[a-z0-9][a-z0-9-]*$/.test(internalName)) {
  fail(`内部識別子は英小文字・数字・ハイフンだけにしてほしい: "${internalName}"`)
}
if (existsSync(targetDir)) {
  fail(`作成先が既にある: ${targetDir}`)
}

function fail(message) {
  console.error(`\n中止した: ${message}\n`)
  process.exit(1)
}

// ---------------------------------------------------------------- 複製

console.log(`雛形を複製する`)
console.log(`  元: ${TEMPLATE_ROOT}`)
console.log(`  先: ${targetDir}`)

mkdirSync(targetDir, { recursive: true })
cpSync(TEMPLATE_ROOT, targetDir, {
  recursive: true,
  filter: (src) => {
    const rel = src.slice(TEMPLATE_ROOT.length + 1)
    if (!rel) return true
    const normalized = rel.replace(/\\/g, '/')
    return !SKIP.has(rel.split(/[\\/]/)[0]) && !DEVELOPMENT_ONLY.has(normalized)
  }
})

// ---------------------------------------------------------------- 差し替え

const appId = `dev.austin.${internalName}`

/** ファイルの中身を置換する。対象が無い場合は黙って飛ばさず知らせる */
function replaceIn(relPath, replacements) {
  const path = join(targetDir, relPath)
  if (!existsSync(path)) {
    console.warn(`  ! 見つからない: ${relPath}`)
    return
  }
  let text = readFileSync(path, 'utf8')
  let changed = 0
  for (const [from, to] of replacements) {
    const before = text
    text = text.split(from).join(to)
    if (text !== before) changed++
  }
  writeFileSync(path, text)
  console.log(`  ${relPath}${changed} 箇所`)
}

console.log('\n名前を差し替える')

replaceIn('src/shared/app-meta.ts', [
  [`export const INTERNAL_NAME = 'app-kit'`, `export const INTERNAL_NAME = '${internalName}'`],
  ['export const IS_TEMPLATE = true', 'export const IS_TEMPLATE = false'],
  [`export const DISPLAY_NAME = 'app-kit'`, `export const DISPLAY_NAME = '${displayName}'`],
  [`export const APP_ID = 'dev.austin.app-kit'`, `export const APP_ID = '${appId}'`]
])

replaceIn('src/main/update-check.ts', [[`const REPO = 'app-kit'`, `const REPO = '${internalName}'`]])

replaceIn('src/renderer/index.html', [['<title>app-kit</title>', `<title>${displayName}</title>`]])

// package.json は構造を壊さないよう JSON として扱う
{
  const path = join(targetDir, 'package.json')
  const pkg = JSON.parse(readFileSync(path, 'utf8'))
  pkg.name = internalName
  pkg.version = '0.1.0'
  pkg.description = `${displayName}`
  pkg.build.appId = appId
  pkg.build.productName = displayName
  delete pkg.scripts['gallery']
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`  package.json … name / version / description / appId / productName`)
}

// lockfile側のルートpackage情報も揃える。ここが雛形の版・名前のままだと、
// 最初のnpm操作で意図しない差分が出て「生成直後のコミット」が再現不能になる。
{
  const path = join(targetDir, 'package-lock.json')
  const lock = JSON.parse(readFileSync(path, 'utf8'))
  lock.name = internalName
  lock.version = '0.1.0'
  if (lock.packages?.['']) {
    lock.packages[''].name = internalName
    lock.packages[''].version = '0.1.0'
  }
  writeFileSync(path, JSON.stringify(lock, null, 2) + '\n')
  console.log(`  package-lock.json … name / version`)
}

// ---------------------------------------------------------------- 初期化

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(targetDir, 'CHANGELOG.md'),
  `# 更新履歴

バージョンは \`package.json\` の \`version\` と一致させる。
機能追加・修正のまとまりごとに 1 エントリ足し、同時に patch（または minor）を上げる。

## [0.1.0] - ${today}

- ${displayName} を作り始めた（雛形 app-kit から生成）
`
)
console.log('  CHANGELOG.md … 初期化')

// 雛形の README は「雛形の説明」なので、アプリ用に置き換える
writeFileSync(
  join(targetDir, 'README.md'),
  `# ${displayName}

雛形 [app-kit](https://github.com/Austin0111/app-kit) から作成。

## セットアップ

Node.js 22.12.0以上を使う。

\`\`\`
npm install --ignore-scripts
node node_modules/electron/install.js
npx electron-rebuild -w better-sqlite3
\`\`\`

**この3手順で入れること。** 依存導入時の任意スクリプトを止め、Electron本体を
明示的に取得してからnative moduleを対象Electronへ揃える。

\`drizzle-kit\`の安定版が旧loader経由で要求するesbuildだけを、\`package.json\`の
\`overrides\`で修正版へ固定している。解除前に\`npm audit\`と
\`npm run db:generate\`の両方を確認すること。

\`\`\`
npm run dev       開発起動
npm run verify    型・名前・ビルド・テストをまとめて確認
\`\`\`

雛形が備えるもの（設定KV / バックアップ / ログ / 秘密情報 / UI部品 / 更新通知）の
詳しい説明は、雛形側の README を参照。
`
)
console.log('  README.md … アプリ用に置き換え')

// ---------------------------------------------------------------- git

try {
  execFileSync('git', ['init', '-q'], { cwd: targetDir })
  execFileSync('git', ['add', '-A'], { cwd: targetDir })
  execFileSync('git', ['commit', '-q', '-m', `${displayName} を作り始めた（雛形 app-kit から生成）`], {
    cwd: targetDir
  })
  console.log('  git … 初期化して最初のコミットを作った')
} catch (err) {
  console.warn(`  ! git の初期化に失敗した（手で行ってほしい）: ${String(err).slice(0, 120)}`)
}

// ---------------------------------------------------------------- 確認

/**
 * 雛形の名前が残っていないかを、src と tests の**全体**に対して見る。
 *
 * 【なぜ app-meta.ts だけでは足りなかったか】
 *   以前はここが app-meta.ts しか見ておらず、`tests/packaged.spec.ts` に
 *   直書きされていた `app-kit.exe` を取りこぼしていた。
 *   その結果、**雛形の中では通るが、作ったアプリでは永久に飛ばされる検査**が
 *   出来上がっていた（ゲームデスクで発覚するまで誰も気づかなかった）。
 *
 *   名前を差し替える箇所が増えるたびに同じ取りこぼしが起こり得るので、
 *   一箇所ずつ確認するのをやめ、**残骸そのものを探す**形にした。
 */
const leftovers = []
for (const dir of ['src', 'tests']) {
  for (const file of walk(join(targetDir, dir))) {
    if (!/\.(ts|tsx|html|css)$/.test(file)) continue
    if (readFileSync(file, 'utf8').includes('app-kit')) {
      leftovers.push(file.slice(targetDir.length + 1).replace(/\\/g, '/'))
    }
  }
}
if (leftovers.length > 0) {
  console.warn(`\n! 雛形の名前 "app-kit" が残っている。手で確認してほしい:`)
  for (const file of leftovers) console.warn(`    ${file}`)
}

/** フォルダを再帰的に辿ってファイルのパスを返す */
function walk(dir) {
  const out = []
  let entries = []
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

console.log(`
できた: ${targetDir}

  内部識別子 : ${internalName}   （変えない。userData/DB/バックアップ名に使う）
  表示名     : ${displayName}   （いつでも変えられる）
  アプリID   : ${appId}

次にやること:

  cd ${targetDir}
  npm install --ignore-scripts
  node node_modules/electron/install.js
  npx electron-rebuild -w better-sqlite3
  npm run verify
  npm run dev

雛形に付いてくる動作確認用のもの（notes テーブル、APIキーの設定欄、画面の各節）は
そのアプリに要らなければ消してよい。
`)
