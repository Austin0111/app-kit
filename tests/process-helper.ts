import { spawn } from 'child_process'
import { join } from 'path'

export async function runElectronProcess(
  env: Record<string, string>,
  timeoutMs = 15_000
): Promise<{ code: number | null; output: string }> {
  const executable = join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe')
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['out/main/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test', APP_E2E: '1', ...env },
      windowsHide: true
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += String(chunk)))
    child.stderr.on('data', (chunk) => (output += String(chunk)))
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Electron process timed out:\n${output}`))
    }, timeoutMs)
    child.once('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      resolve({ code, output })
    })
  })
}
