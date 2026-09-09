import { useEffect, useState } from 'react'
import type { UpdateInfo } from '../../../main/update-check'

/**
 * アプリ名の右に出す版表記。更新があれば知らせる。
 *
 * 映棚が実装している形（タイトルバーに `v0.6.7` を出す）を踏襲したもの。
 * **自動更新はしない。** 押すとリリースページをブラウザで開くだけ。
 */
export function VersionBadge({
  onShowChangelog
}: {
  onShowChangelog?: () => void
}): JSX.Element | null {
  const [version, setVersion] = useState<string>('')
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    window.api.app.version().then(setVersion)
    // 起動直後の確認。失敗しても中で握るので、ここで catch は要らない
    window.api.app.checkUpdate().then(setUpdate)
  }, [])

  if (!version) return null

  return (
    <span className="version">
      <button
        className="version__label"
        onClick={onShowChangelog}
        title="更新履歴を見る"
      >
        v{version}
      </button>
      {update?.hasUpdate && (
        <button
          className="version__update"
          onClick={() => window.api.app.openReleases()}
          title={`新しい版 ${update.latestVersion} がある。ブラウザで開く`}
        >
          更新あり
        </button>
      )}
    </span>
  )
}
