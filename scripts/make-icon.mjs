#!/usr/bin/env node
/**
 * 仮のアプリアイコンを作る（依存ライブラリ無し）。
 *
 *   node scripts/make-icon.mjs
 *
 * 差し替え前の「とりあえず既定の Electron アイコンではない状態」を作るためのもの。
 * 本番用の絵が出来たら、同じ場所に上書きすればよい。
 *
 * 【置き場所を 2 つに分ける理由】
 *   build/icon.ico  … electron-builder が読む（インストーラ・exe のアイコン）。
 *                     **asar には入らない**ので、アプリの実行中には読めない
 *   assets/icon.ico … アプリが実行中に読むもの（トレイ等）
 *
 *   CharaLauncher はここを取り違えて、ウィンドウのアイコンは exe 埋め込みへ
 *   自動フォールバックするため気づかず、**フォールバックの無い Tray だけが
 *   壊れる**という分かりにくい症状を踏んでいる。最初から両方に置いて避ける。
 */
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const SIZES = [16, 24, 32, 48, 64, 128, 256]

/** 背景色（雛形のアクセント色に合わせる） */
const BG = [124, 58, 237] // #7c3aed
const FG = [255, 255, 255]

/** その大きさの RGBA 画素を作る。角丸の四角に斜めの線を入れただけの図形 */
function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const radius = Math.max(2, Math.round(size * 0.22))
  const margin = Math.max(1, Math.round(size * 0.09))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inBox = insideRoundedRect(x, y, margin, size - margin, radius)
      if (!inBox) continue

      // 左上から右下への帯を白抜きにする
      const d = Math.abs(x - y)
      const onStripe = d < Math.max(1, size * 0.11)
      const c = onStripe ? FG : BG

      px[i] = c[0]
      px[i + 1] = c[1]
      px[i + 2] = c[2]
      px[i + 3] = 255
    }
  }
  return px
}

function insideRoundedRect(x, y, min, max, r) {
  if (x < min || x >= max || y < min || y >= max) return false
  const cx = x < min + r ? min + r : x > max - r - 1 ? max - r - 1 : x
  const cy = y < min + r ? min + r : y > max - r - 1 ? max - r - 1 : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** RGBA 画素から PNG を組み立てる（ico の中身は PNG でよい） */
function toPng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // フィルタ種別: なし
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // ビット深度
  ihdr[9] = 6 // カラータイプ: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

/** 複数の PNG を 1 つの .ico にまとめる */
function toIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // 予約
  header.writeUInt16LE(1, 2) // 種別: アイコン
  header.writeUInt16LE(pngs.length, 4)

  let offset = 6 + pngs.length * 16
  const entries = []
  for (const { size, png } of pngs) {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size // 256 は 0 で表す決まり
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // カラープレーン
    e.writeUInt16LE(32, 6) // ビット深度
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    offset += png.length
  }

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)])
}

const pngs = SIZES.map((size) => ({ size, png: toPng(size, drawIcon(size)) }))
const ico = toIco(pngs)

for (const dir of ['build', 'assets']) {
  mkdirSync(join(ROOT, dir), { recursive: true })
  writeFileSync(join(ROOT, dir, 'icon.ico'), ico)
  console.log(`  ${dir}/icon.ico … ${SIZES.join(', ')} px（${(ico.length / 1024).toFixed(1)} KB）`)
}

console.log(`
build/  … electron-builder が読む（インストーラ・exe のアイコン）
assets/ … アプリが実行中に読む（トレイ等）。**asar に入るのはこちらだけ**

本番用の絵が出来たら同じ場所に上書きすること。`)
