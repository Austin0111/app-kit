import { net, shell } from 'electron'
import { log } from './log'
import { APP_VERSION } from '../shared/app-meta'

/**
 * 更新の確認。**通知のみで、自動更新はしない。**
 *
 * NeeView（本家）が採っている作法の移植。GitHub の Releases を見て最新版と比べ、
 * 新しければ知らせる。ダウンロードはブラウザに委ねる。
 *
 * 【なぜ自動更新にしないか】
 * Windows では署名の無いインストーラに SmartScreen の警告が出る。
 * しかも**新しいバイナリごとに再発する**ので、自動更新の「気づかぬうちに新しくなる」
 * という利点が消える。署名は年 $226〜＋ハードウェアトークン＋毎年更新が要り、
 * さらに OV では「評判」が貯まるまで警告が消えない（利用者が少ないと永久に貯まらない）。
 * 費用と手間に見合わないため、通知のみを選んだ。
 * 利用者が増えて毎版の警告が実際に負担になったら、その時に見直す。
 */

/** 配布用リポジトリ。コードを非公開にする場合はここだけ公開の器を指す。 */
const OWNER = 'Austin0111'
const REPO = 'app-kit'

export type UpdateInfo = {
  /** 新しい版があるか */
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  /** リリースページ。DL はここをブラウザで開かせる */
  url?: string
  /** 確認できなかった理由（通信不可・未公開など）。hasUpdate は false になる */
  problem?: string
}

/**
 * 版を比べる。`v1.2.3` のような接頭辞と、`1.2.3-beta` のような接尾辞を落として数値で比較する。
 * 数値の桁数が違っても正しく比べられるようにする（1.10.0 > 1.9.0）。
 */
function isNewer(latest: string, current: string): boolean {
  const parse = (v: string): number[] =>
    v
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0)

  const a = parse(latest)
  const b = parse(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/**
 * 最新版を調べる。
 *
 * **失敗しても例外を投げない。** 起動時に静かに走らせる想定で、
 * 通信できない・まだリリースが無い、といった状況は「異常」ではないため。
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  // app.getVersion() は起動のされ方で Electron 自身の版を返すことがある（app-meta.ts 参照）
  const currentVersion = APP_VERSION

  try {
    // Node の fetch ではなく net を使う。Chromium のネットワーク設定
    // （プロキシ等）に従わせるため
    const res = await net.fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `${REPO}/${currentVersion}`
        }
      }
    )

    if (res.status === 404) {
      // まだ一度もリリースを作っていない場合。異常ではない
      return { hasUpdate: false, currentVersion, problem: 'まだ公開された版がない' }
    }
    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        problem: `確認できなかった（HTTP ${res.status}）`
      }
    }

    const json = (await res.json()) as { tag_name?: string; html_url?: string }
    const latestVersion = json.tag_name
    if (!latestVersion) {
      return { hasUpdate: false, currentVersion, problem: '版の情報を読み取れなかった' }
    }

    const hasUpdate = isNewer(latestVersion, currentVersion)
    if (hasUpdate) {
      log.info('新しい版がある', { 現在: currentVersion, 最新: latestVersion })
    }
    return { hasUpdate, currentVersion, latestVersion, url: json.html_url }
  } catch (err) {
    // 通信できない状況は珍しくない。ログに残すが騒がない
    log.debug('更新の確認に失敗した', { 詳細: err })
    return { hasUpdate: false, currentVersion, problem: '通信できなかった' }
  }
}

/** リリースページをブラウザで開く。アプリ内ではダウンロードしない。 */
export async function openReleasePage(url?: string): Promise<void> {
  await shell.openExternal(url ?? `https://github.com/${OWNER}/${REPO}/releases`)
}
