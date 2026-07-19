import { useCallback, useEffect, useState } from 'react'
import { SETTINGS_DEFAULTS, type Settings } from '../../shared/settings'

/**
 * 設定を読み、変更を購読する。
 * main 側が全窓へ変更を配るので、複数窓を開いても表示がズレない。
 */
export function useSettings(): {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
  loaded: boolean
} {
  const [settings, setSettings] = useState<Settings>(SETTINGS_DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    window.api.settings.getAll().then((s) => {
      if (!alive) return
      setSettings(s)
      setLoaded(true)
    })

    const off = window.api.settings.onChange((patch) => {
      setSettings((prev) => ({ ...prev, ...patch }))
    })

    return () => {
      alive = false
      off()
    }
  }, [])

  // 楽観更新してから保存する。保存の往復を待たないので操作が引っかからない。
  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    await window.api.settings.setMany(patch)
  }, [])

  return { settings, update, loaded }
}
