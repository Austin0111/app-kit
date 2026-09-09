import { expect, test } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * **配布版（パッケージ済み）が実際に動くか**を確かめる。
 *
 * 開発時に通っても配布版で壊れる、という事故は起きうる。実際この雛形でも
 * 「マイグレーションの場所が起動のされ方で変わる」問題を踏んでいる。
 * 配布版では `app.isPackaged` が真になり、drizzle と CHANGELOG を
 * `process.resourcesPath` から読む**別の経路**に入る。ここは開発時に一度も通らない。
 *
 * `npm run dist` を実行していない場合は飛ばす（毎回ビルドすると重すぎるため）。
 * 配布前には必ず一度これを通すこと。
 */

/**
 * 実行ファイル名は `build.productName` から作られる。
 *
 * **ここを直書きしてはいけない。** 以前は雛形の実行ファイル名を直書きしており、
 * `create-app.mjs` はここを差し替えないため、**雛形から作ったアプリでは
 * 存在しないパスを見ることになっていた**。その結果 `npm run dist` を通しても
 * この検査は毎回黙って飛ばされ、「作ったのに一度も走らない検査」になっていた
 * （ゲームデスクで実際に発覚した）。
 *
 * なお、この注釈に雛形の名前そのものを書かないこと。
 * `create-app.mjs` の残骸検出に引っかかって偽の警告が出る。
 *
 * package.json から導けば、名前を何に変えても追随する。
 */
const PRODUCT_NAME = JSON.parse(readFileSync('package.json', 'utf8')).build.productName
const EXE = join('dist', 'win-unpacked', `${PRODUCT_NAME}.exe`)
const EXPECTED_ELECTRON = JSON.parse(
  readFileSync(join('node_modules', 'electron', 'package.json'), 'utf8')
).version

/**
 * **その配布版を作った時の版**を読む（`package.json` の現在値ではない）。
 *
 * 版を上げた直後は `dist` が一世代古い。そこで `package.json` と突き合わせると
 * **版を上げるたびに verify が赤くなる**。それは「配布版が壊れている」ではなく
 * 「dist が古い」というだけの話で、赤の意味が薄まる。
 *
 * ここで確かめたいのは *埋め込みの仕組みが効いているか*（`app.getVersion()` を
 * 使うと Electron 自身の版が出てしまう問題）なので、dist 側の版と照合すれば足りる。
 * dist が最新かどうかは、配布の直前に人が見る話。
 */
function distVersion(): string {
  // publish 設定がある構成では latest.yml が出る
  try {
    const yml = readFileSync(join('dist', 'latest.yml'), 'utf8')
    const found = yml.match(/^version:\s*(.+)$/m)
    if (found?.[1]) return found[1].trim()
  } catch {
    // 次の手を試す
  }

  // 無い構成もあるので、インストーラのファイル名（"<表示名> Setup <版>.exe"）から拾う。
  // **この段は消さないこと。** 雛形自身は latest.yml が出るので上で足りてしまうが、
  // publish 設定を持たないアプリではここだけが頼りになる（ゲームデスクがそうだった）
  try {
    for (const name of readdirSync('dist')) {
      const found = name.match(/ Setup (\d+\.\d+\.\d+[^ ]*)\.exe$/)
      if (found?.[1]) return found[1]
    }
  } catch {
    // 次の手を試す
  }

  // どちらも読めなければ現在の版で見る（dist が最新である前提になる）
  return JSON.parse(readFileSync('package.json', 'utf8')).version
}

test.describe('配布版', () => {
  if (process.env.REQUIRE_PACKAGED === '1' && !existsSync(EXE)) {
    throw new Error(`配布版が見つからない: ${EXE}`)
  }
  test.skip(!existsSync(EXE), '`npm run dist` を実行してから確かめること')

  test('パッケージ版が起動し、DBと変更履歴を読める', async () => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'e2e-packaged-'))

    const app = await electron.launch({
      executablePath: EXE,
      env: { ...process.env, APP_USER_DATA_DIR: userDataDir }
    })

    try {
      const page = await app.firstWindow()
      await page.waitForSelector('.titlebar', { timeout: 20_000 })

      // 画面が出た＝マイグレーションが resources から読めている
      // （読めなければ起動時に失敗ダイアログを出して終了する）
      await expect(page.getByText('設定を読み込み済み')).toBeVisible()

      // 配布物へ意図したElectron本体が入ったか。package.jsonだけ更新され、
      // 古いruntimeでpackagingされた事故を見逃さない。
      const runtimeVersion = await app.evaluate(() => process.versions.electron)
      // 通常verifyでは古いdistが残っていてもよい。fresh distを必須にする
      // test:packaged（REQUIRE_PACKAGED=1）だけが現在の依存版との一致を担う。
      if (process.env.REQUIRE_PACKAGED === '1') expect(runtimeVersion).toBe(EXPECTED_ELECTRON)

      // アプリ自身の版が出ている（Electron自身の版が出ていたら失敗）
      await expect(page.locator('.version__label')).toHaveText(`v${distVersion()}`)

      // CHANGELOG も resources から読めるか（extraResources の確認）
      await page.locator('.version__label').click()
      await expect(page.locator('.changelog')).toContainText('更新履歴')

      // DB への書き込みが通るか（better-sqlite3 が asar の外で動いているか）
      await page.locator('dialog.dialog').getByRole('button', { name: '閉じる' }).click()
      await page.getByPlaceholder('何か書いて Enter').fill('配布版の確認')
      await page.getByRole('button', { name: '追加' }).click()
      await expect(page.getByText('配布版の確認')).toBeVisible()
    } finally {
      await app.close()
      try {
        rmSync(userDataDir, { recursive: true, force: true })
      } catch {
        // 掴まれたままなら残る。一時フォルダなので放っておいてよい
      }
    }
  })
})
