#!/usr/bin/env node
/**
 * ファイルを編集するたびに型検査を走らせるフック（PostToolUse / Edit・Write）。
 *
 * 【なぜ要るか】
 * 完了条件（npm run verify）は作業の終わりに 1 回しか走らない。
 * その間に 10 箇所直すと、3 番目の誤りが最後になって発覚する。
 * ここで**その場で止める**ことで、間違いを抱えたまま進むのを防ぐ。
 *
 * **完了条件の代わりではない。** 型で分かるのは型の誤りだけで、
 * 描画の崩れも配布版の壊れも捕まえられない。二段構えの前段。
 *
 * 【設計】
 * - jq に依存しない（Windows には無いことが多い）。Node だけで完結させる
 * - .ts / .tsx 以外（.md / .json / .css 等）は即座に抜ける。無駄に 1.5 秒待たせない
 * - 型検査そのものが失敗した場合（tsc が無い等）は**通す**。
 *   仕組みの不調で作業を止めるのは本末転倒なので、知らせるだけにする
 */
import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 標準入力の JSON を読む。読めなければ何もしない */
function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

const input = readInput()
if (!input) process.exit(0)

const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath ?? ''
if (!/\.(ts|tsx)$/i.test(filePath)) process.exit(0)

// tsc を直接呼ぶ（npx を挟むと毎回の起動分だけ遅くなる）
const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')

try {
  execFileSync(
    process.execPath,
    [
      tsc,
      '--noEmit',
      // 差分のみ見るので 2.1 秒 → 1.5 秒になる。
      // 生成物は node_modules 配下に置く（.gitignore 済みで、掃除も npm 任せにできる）
      '--incremental',
      '--tsBuildInfoFile',
      join(ROOT, 'node_modules', '.cache', 'typecheck-hook.tsbuildinfo')
    ],
    { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }
  )
  // 通った。何も言わずに終わる
  process.exit(0)
} catch (err) {
  const output = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim()

  // tsc 自体が見つからない等は「型エラー」ではない。作業を止めずに知らせるだけ
  if (!output || !/error TS\d+/.test(output)) {
    console.log(
      JSON.stringify({
        systemMessage: `型検査を実行できなかった（フックの不調。作業は続行する）: ${output.slice(0, 200)}`
      })
    )
    process.exit(0)
  }

  const lines = output.split(/\r?\n/).filter(Boolean)
  const shown = lines.slice(0, 30).join('\n')
  const rest = lines.length > 30 ? `\n…他 ${lines.length - 30} 行` : ''

  // decision: block で、直すまで次へ進ませない
  console.log(
    JSON.stringify({
      decision: 'block',
      reason:
        `型エラーが出ている。**先に直すこと。**\n\n${shown}${rest}\n\n` +
        `（この確認は編集のたびに自動で走る。全体の確認は npm run verify）`
    })
  )
  process.exit(0)
}
