import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { basename, join, relative, resolve } from 'path'
import { _electron as electron } from '@playwright/test'
import { UUID } from 'builder-util-runtime'

if (process.platform !== 'win32') throw new Error('NSISインストーラ検証はWindows専用')

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const productName = pkg.build.productName
const electronBuilderNamespace = UUID.parse('50e065bc-3134-11e6-9bab-38c9862bdaf3')
const appGuid = pkg.build.nsis?.guid ?? UUID.v5(pkg.build.appId, electronBuilderNamespace)
const installer = join(root, 'dist', `${productName} Setup ${pkg.version}.exe`)
if (!existsSync(installer)) throw new Error(`現行版インストーラが見つからない: ${installer}`)

function run(path, args) {
  const result = spawnSync(path, args, { cwd: root, encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(
      `${basename(path)} が終了コード ${result.status ?? 'unknown'} で失敗した\n${result.stdout}${result.stderr}`
    )
  }
}

function installedRegistrations() {
  const command = [
    "$roots=@('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')",
    '$found=foreach($root in $roots){Get-ItemProperty $root -ErrorAction SilentlyContinue|Where-Object{$_.DisplayName -eq $env:APP_INSTALLER_PRODUCT -or $_.DisplayName -like "$env:APP_INSTALLER_PRODUCT *"}|ForEach-Object{[pscustomobject]@{DisplayName=$_.DisplayName;UninstallString=$_.UninstallString}}}',
    'ConvertTo-Json -Compress -InputObject @($found)'
  ].join(';')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, APP_INSTALLER_PRODUCT: productName }
  })
  if (result.status !== 0) throw new Error(`インストール登録を確認できない: ${result.stderr}`)
  return JSON.parse(result.stdout.trim() || '[]')
}

function installationLocations() {
  const command = [
    "$roots=@('HKCU:\\Software','HKCU:\\Software\\WOW6432Node','HKLM:\\Software','HKLM:\\Software\\WOW6432Node')",
    '$found=foreach($root in $roots){$path=Join-Path $root $env:APP_INSTALLER_GUID; $item=Get-ItemProperty -LiteralPath $path -ErrorAction SilentlyContinue; if($item){[pscustomobject]@{Path=$path;InstallLocation=$item.InstallLocation}}}',
    'ConvertTo-Json -Compress -InputObject @($found)'
  ].join(';')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, APP_INSTALLER_GUID: appGuid }
  })
  if (result.status !== 0) throw new Error(`インストール先登録を確認できない: ${result.stderr}`)
  return JSON.parse(result.stdout.trim() || '[]')
}

function shortcutPaths() {
  const command = [
    '$shortcutName="$($env:APP_INSTALLER_PRODUCT).lnk"',
    '$paths=@((Join-Path ([Environment]::GetFolderPath("Desktop")) $shortcutName),(Join-Path ([Environment]::GetFolderPath("Programs")) $shortcutName))',
    'ConvertTo-Json -Compress -InputObject @($paths|Where-Object{Test-Path -LiteralPath $_})'
  ].join(';')
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, APP_INSTALLER_PRODUCT: productName }
  })
  if (result.status !== 0) throw new Error(`ショートカットを確認できない: ${result.stderr}`)
  return JSON.parse(result.stdout.trim() || '[]')
}

function waitForRemoval(path, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (existsSync(path) && Date.now() < deadline) {
    // NSIS uninstallerは自身を一時場所へ複製してから削除するため、短く待つ。
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100)
  }
  if (existsSync(path)) throw new Error(`アンインストール後も実行ファイルが残っている: ${path}`)
}

if (
  installedRegistrations().length !== 0 ||
  installationLocations().length !== 0 ||
  shortcutPaths().length !== 0
) {
  throw new Error(`${productName} は既にインストール済み。既存環境を守るため検証を中止した`)
}

const testRoot = mkdtempSync(join(tmpdir(), `${pkg.name}-installer-`))
const installDir = join(testRoot, 'installed')
const userDataDir = join(testRoot, 'user-data')
const appExe = join(installDir, `${productName}.exe`)
let installAttempted = false
let electronApp = null

try {
  installAttempted = true
  run(installer, ['/S', `/D=${installDir}`])
  if (!existsSync(appExe)) throw new Error(`インストール先に実行ファイルがない: ${appExe}`)
  const registrations = installedRegistrations()
  const expectedDisplayName = `${productName} ${pkg.version}`
  const expectedUninstaller = resolve(installDir, `Uninstall ${productName}.exe`).toLowerCase()
  if (
    registrations.length !== 1 ||
    registrations[0].DisplayName !== expectedDisplayName ||
    !registrations[0].UninstallString?.toLowerCase().includes(expectedUninstaller)
  ) {
    throw new Error(`インストール登録が期待と違う: ${JSON.stringify(registrations)}`)
  }
  const locations = installationLocations()
  if (
    locations.length !== 1 ||
    resolve(locations[0].InstallLocation).toLowerCase() !== resolve(installDir).toLowerCase()
  ) {
    throw new Error(`インストール先登録が期待と違う: ${JSON.stringify(locations)}`)
  }

  electronApp = await electron.launch({
    executablePath: appExe,
    env: { ...process.env, APP_USER_DATA_DIR: userDataDir, APP_E2E: '1', NODE_ENV: 'test' }
  })
  const page = await electronApp.firstWindow()
  await page.waitForSelector('.titlebar', { timeout: 20_000 })
  if ((await page.locator('.version__label').textContent()) !== `v${pkg.version}`) {
    throw new Error('インストール版のアプリ版が一致しない')
  }
  const runtime = await electronApp.evaluate(() => process.versions.electron)
  const expectedRuntime = JSON.parse(
    readFileSync(join(root, 'node_modules', 'electron', 'package.json'), 'utf8')
  ).version
  if (runtime !== expectedRuntime) throw new Error(`内包Electronが違う: ${runtime} != ${expectedRuntime}`)
  await page.evaluate(() => window.api.notes.add('インストール版の確認'))
  const notes = await page.evaluate(() => window.api.notes.list())
  if (!notes.some((note) => note.body === 'インストール版の確認')) {
    throw new Error('インストール版でDBへ読み書きできない')
  }
  await electronApp.close()
  electronApp = null

  const uninstallerName = readdirSync(installDir).find((name) => /^Uninstall .*\.exe$/i.test(name))
  if (!uninstallerName) throw new Error('アンインストーラが見つからない')
  run(join(installDir, uninstallerName), ['/S'])
  installAttempted = false
  waitForRemoval(appExe)
  if (installedRegistrations().length !== 0) throw new Error('アンインストール登録が残っている')
  if (installationLocations().length !== 0) throw new Error('インストール先登録が残っている')
  if (shortcutPaths().length !== 0) throw new Error('アンインストール後もショートカットが残っている')
  console.log(`test:installer PASS: ${productName} ${pkg.version}`)
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined)
  if (installAttempted && existsSync(installDir)) {
    const uninstallerName = readdirSync(installDir).find((name) => /^Uninstall .*\.exe$/i.test(name))
    if (uninstallerName) {
      spawnSync(join(installDir, uninstallerName), ['/S'], { windowsHide: true })
      waitForRemoval(appExe)
    }
  }

  const residualState = {
    registrations: installedRegistrations(),
    locations: installationLocations(),
    shortcuts: shortcutPaths()
  }
  if (
    residualState.registrations.length !== 0 ||
    residualState.locations.length !== 0 ||
    residualState.shortcuts.length !== 0
  ) {
    throw new Error(`インストーラ検証の後始末に失敗した: ${JSON.stringify(residualState)}`)
  }

  const tempRoot = resolve(tmpdir())
  const resolvedTestRoot = resolve(testRoot)
  const rel = relative(tempRoot, resolvedTestRoot)
  if (!rel || rel.startsWith('..') || rel.includes(':')) {
    throw new Error(`一時フォルダ外は削除しない: ${resolvedTestRoot}`)
  }
  rmSync(resolvedTestRoot, { recursive: true, force: true })
}
