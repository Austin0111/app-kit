/**
 * 外部プロセスの起動と進捗パース。
 *
 * ============================================================================
 * 【このファイルはどこからも import されていない】
 * 雛形に「実行可能なメモ」として置いてあるだけ。子プロセスを起動しないアプリでは
 * **まるごと消してよい**（消しても他は動く）。
 *
 * 置いてある理由は、下に書いた各指定の *根拠* が実機検証の産物で、
 * 知らずに書くと必ず踏むため。使う時は根拠ごと読むこと。
 * ============================================================================
 *
 * 出典: CharaLauncher（起動）/ 映棚（yt-dlp・ffmpeg の進捗）/ ehentai_dl（stdout プロトコル）
 */

import { spawn, type SpawnOptions } from 'child_process'

// ---------------------------------------------------------------------------
// 1. 起動オプションの既定
// ---------------------------------------------------------------------------

/**
 * Windows で子プロセスを「静かに」起動するための既定。
 *
 * 【windowsHide: true が本質的解決】
 *   CREATE_NO_WINDOW が付き、子に *親とは別の隠しコンソール* が与えられる。
 *   これが無いと、起動先が AttachConsole(ATTACH_PARENT_PROCESS) を呼んだ時に
 *   こちらのコンソール（npm 端末）へログを直書きしてくる。
 *   **`stdio:'ignore'` では防げない**（stdio はストリームの話で、コンソールの
 *   アタッチ先とは別物）。CharaLauncher が実機で突き止めた結論。
 *
 * 【detached: true を安易に付けてはいけない】
 *   DETACHED_PROCESS になると、配下の PowerShell `Start-Process` が
 *   **サイレントに失敗する**（エラーも出ずアプリが起動しない）。
 *   CharaLauncher がマトリクステストで確認済み。
 *   プロセスを独立させたいだけなら `child.unref()` で足りる。
 */
export const QUIET_SPAWN: SpawnOptions = {
  stdio: 'ignore',
  windowsHide: true
}

/**
 * 起動して投げっぱなしにする（終了を待たない）。
 * 戻り値は「起動できたか」だけ。ENOENT 等は例外にせず Error を返す。
 *
 * NOTE: CharaLauncher では同等の関数が `spawnDetached` という名前だが、
 *       実装は detached を使っていない（上記の理由で使えない）。
 *       名前と実態が食い違って紛らわしいので、こちらでは改名した。
 */
export function launchDetached(
  file: string,
  args: string[] = [],
  opts: SpawnOptions = {}
): Promise<Error | null> {
  return new Promise((resolve) => {
    try {
      const child = spawn(file, args, { ...QUIET_SPAWN, ...opts })
      let settled = false
      const done = (err: Error | null): void => {
        if (settled) return
        settled = true
        resolve(err)
      }
      child.once('error', done)
      child.once('spawn', () => done(null))
      child.unref()
    } catch (err) {
      resolve(err as Error)
    }
  })
}

// ---------------------------------------------------------------------------
// 2. 出力を行単位で読む
// ---------------------------------------------------------------------------

/**
 * PowerShell に UTF-8 で出力させるための前置き。
 * `-Command` に渡すスクリプトの先頭へ連結して使う。
 *
 *   run('powershell', { args: ['-NoProfile', '-Command', POWERSHELL_UTF8_PREFIX + '本文'] })
 *
 * これが無いと日本語が CP932 で出てきて化ける（上記「前提」参照）。
 */
export const POWERSHELL_UTF8_PREFIX =
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8; '

export type RunOptions = {
  args?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  /** 標準出力の 1 行ごとに呼ばれる */
  onLine?: (line: string) => void
  /** 標準エラーの 1 行ごとに呼ばれる */
  onErrorLine?: (line: string) => void
  /** 中断用。abort するとプロセスツリーごと落とす */
  signal?: AbortSignal
}

export type RunResult = {
  code: number | null
  /** 中断された場合 true */
  cancelled: boolean
  /** 標準エラーの末尾（失敗時のメッセージ用に少しだけ保持） */
  stderrTail: string
}

/**
 * 外部プロセスを起動し、出力を行単位で流しながら終了を待つ。
 *
 * 【前提: 子プロセスが UTF-8 で出力すること】★最初に踏む罠
 *   Node 側は setEncoding('utf8') で受けるが、**Windows のコンソール既定
 *   コードページは日本語環境では CP932(Shift_JIS系)** で、多くのコマンドは
 *   そちらで出力する。何もしないと日本語が確実に化ける。
 *   （CommandDeck が ConPTY と xterm.js の間で踏んだのと同じ問題。
 *     Node の setEncoding は cp932 を扱えないので、*子側を UTF-8 にする* のが正解）
 *
 *   - Python 製ツール(yt-dlp 等) … 下の env で PYTHONIOENCODING/PYTHONUTF8 を渡すので対応済み
 *   - PowerShell                … {@link POWERSHELL_UTF8_PREFIX} をスクリプト先頭に付ける
 *   - cmd                       … 先に `chcp 65001` を実行する
 *   - 自作スクリプト            … 出力側を UTF-8 に固定しておく
 *
 * 【setEncoding('utf8') を必ず掛けること】
 *   data イベントの生 Buffer に対して毎回 `buf.toString('utf8')` すると、
 *   **日本語などのマルチバイト文字がチャンク境界で分断された時に文字化けする**。
 *   setEncoding を掛けると Node 内部の StringDecoder が境界をまたいで
 *   正しく処理してくれる。文字コード（chcp）の問題とは別の、Node 側の一般的な罠。
 *   映棚が実際に踏んで直した箇所。
 *
 * 【Windows では kill がプロセスツリーに伝播しない】
 *   `child.kill()` は本人しか殺さないため、その子（yt-dlp が内部で起動する
 *   ffmpeg 等）が生き残る。Windows にはプロセスグループへのシグナル伝播が無い。
 *   → `taskkill /T /F` でツリーごと落とす。
 */
export function run(file: string, opts: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, opts.args ?? [], {
      windowsHide: true,
      cwd: opts.cwd,
      // Python 製のツール（yt-dlp 等）は出力エンコーディングを明示しないと
      // Windows で既定コードページに引きずられる
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...opts.env }
    })

    let cancelled = false
    if (opts.signal) {
      const killTree = (): void => {
        cancelled = true
        try {
          if (child.pid) {
            spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
          }
        } catch {
          // 既に終了している場合など。無視してよい
        }
      }
      if (opts.signal.aborted) killTree()
      else opts.signal.addEventListener('abort', killTree, { once: true })
    }

    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')

    const stdoutReader = lineReader((l) => opts.onLine?.(l))
    let stderrTail = ''
    const stderrReader = lineReader((l) => {
      // 失敗時のメッセージ用に末尾だけ持つ（全部持つとログが巨大になる）
      stderrTail = (stderrTail + l + '\n').slice(-2000)
      opts.onErrorLine?.(l)
    })

    child.stdout?.on('data', stdoutReader.push)
    child.stderr?.on('data', stderrReader.push)

    // taskkill 後は error と close が両方飛ぶことがあるので二重決着を防ぐ
    let settled = false
    child.on('error', (err) => {
      if (settled) return
      settled = true
      reject(err)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      stdoutReader.flush()
      stderrReader.flush()
      resolve({ code, cancelled, stderrTail })
    })
  })
}

/**
 * チャンクを行に切り出す。行の途中でチャンクが切れた分は次に持ち越す。
 * CR/LF どちらの改行でも切れるようにしておく（yt-dlp の進捗は \r で来る）。
 */
function lineReader(onLine: (line: string) => void): {
  push: (chunk: string) => void
  flush: () => void
} {
  let carry = ''
  let atStart = true
  return {
    push(chunk: string) {
      // Windows のツールは UTF-8 with BOM で吐くものが多い。先頭の U+FEFF を
      // 残すと目に見えない 1 文字のせいで文字列比較が謎に失敗するので落とす。
      if (atStart) {
        atStart = false
        if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1)
      }
      carry += chunk
      const parts = carry.split(/\r\n|\r|\n/)
      // 最後の要素は「まだ改行が来ていない途中の行」なので持ち越す
      carry = parts.pop() ?? ''
      for (const line of parts) {
        if (line.length > 0) onLine(line)
      }
    },
    flush() {
      if (carry.length > 0) {
        onLine(carry)
        carry = ''
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. stdout の接頭辞プロトコル
// ---------------------------------------------------------------------------

/**
 * 自作スクリプト（Python 等）と進捗をやり取りする時の軽い手口。
 * IPC を作らず「決めた接頭辞の行」だけを構造化データとして拾い、
 * それ以外はログとして流す。ehentai_dl が採っていた割り切り。
 *
 * 例: スクリプト側が `PROGRESS:3:120` と出力 → { tag: 'PROGRESS', values: ['3','120'] }
 */
export function parseTaggedLine(
  line: string,
  tags: readonly string[]
): { tag: string; values: string[] } | null {
  for (const tag of tags) {
    const prefix = tag + ':'
    if (line.startsWith(prefix)) {
      return { tag, values: line.slice(prefix.length).split(':') }
    }
  }
  return null
}
