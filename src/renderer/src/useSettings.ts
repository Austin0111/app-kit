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
  error: string | null
  reload: () => Promise<void>
} {
  const [settings, setSettings] = useState<Settings>(SETTINGS_DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const next = await window.api.settings.getAll()
      setSettings(next)
      setLoaded(true)
      setError(null)
    } catch {
      setLoaded(false)
      setError('設定を読み込めませんでした。再試行してください。')
    }
  }, [])

  useEffect(() => {
    let alive = true
    window.api.settings.getAll().then((s) => {
      if (!alive) return
      setSettings(s)
      setLoaded(true)
    }).catch(() => {
      if (!alive) return
      setError('設定を読み込めませんでした。再試行してください。')
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
    setError(null)
    try {
      await window.api.settings.setMany(patch)
    } catch {
      setError('設定を保存できませんでした。状態を読み直してください。')
      try {
        setSettings(await window.api.settings.getAll())
      } catch {
        setLoaded(false)
      }
    }
  }, [])

  return { settings, update, loaded, error, reload }
}
