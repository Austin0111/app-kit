/**
 * 名前の食い違いを検出する。
 *
 * 表示名と識別子は shared/app-meta.ts を唯一の出所にしているが、
 * インストーラ側（package.json の build.*）だけは electron-builder が読むため
 * どうしても二重に書くことになる。**ここがズレると気づきにくい**ので機械で照合する。
 *
 * 気づきにくい理由:
 *   - 開発中は app-meta.ts しか効かないので、ズレていても普通に動く
 *   - 配布して初めて「インストーラの名前が古い」「タスクバーで別アプリ扱い」と分かる
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const meta = readFileSync(join(root, 'src/shared/app-meta.ts'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/** app-meta.ts から `export const NAME = '値'` を読む */
function readConst(name) {
  const m = meta.match(new RegExp(`export const ${name}\\s*=\\s*'([^']*)'`))
  if (!m) throw new Error(`app-meta.ts に ${name} が見つからぬ`)
  return m[1]
}

const checks = [
  {
    what: '表示名',
    meta: readConst('DISPLAY_NAME'),
    pkgPath: 'build.productName',
    pkg: pkg.build?.productName,
    hint: 'インストーラとexeの表示名。改名時はここも合わせる'
  },
  {
    what: 'アプリID',
    meta: readConst('APP_ID'),
    pkgPath: 'build.appId',
    pkg: pkg.build?.appId,
    hint: 'タスクバーのグループ化・通知の識別子。不変'
  },
  {
    what: '内部識別子',
    meta: readConst('INTERNAL_NAME'),
    pkgPath: 'name',
    pkg: pkg.name,
    hint: 'userDataフォルダ名。不変（変えると既存データを見失う）'
  }
]

let ng = 0
for (const c of checks) {
  const ok = c.meta === c.pkg
  if (!ok) ng++
  console.log(
    `${ok ? 'OK  ' : 'NG  '}${c.what.padEnd(6)} app-meta.ts="${c.meta}"  package.json(${c.pkgPath})="${c.pkg}"`
  )
  if (!ok) console.log(`      → ${c.hint}`)
}

if (ng > 0) {
  console.error(`\n名前が ${ng} 件ズレている。上のどちらかに揃えること。`)
  process.exit(1)
}
console.log('\n名前は揃っている。')
