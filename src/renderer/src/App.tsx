import { useEffect, useState } from 'react'
import type { Api } from '../../preload'

declare global {
  interface Window {
    api: Api
  }
}

// 設定の既定値はレンダラ側で1箇所に持ち、main から「既定値つきで一括返却」してもらう。
const SETTING_DEFAULTS = {
  theme: 'dark',
  accentColor: '#7c3aed'
}

type Note = { id: number; body: string; createdAt: string }

export default function App(): JSX.Element {
  const [settings, setSettings] = useState<Record<string, string>>(SETTING_DEFAULTS)
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    window.api.settings.getAll(SETTING_DEFAULTS).then(setSettings)
    window.api.notes.list().then(setNotes)
  }, [])

  async function addNote(): Promise<void> {
    const body = draft.trim()
    if (!body) return
    await window.api.notes.add(body)
    setDraft('')
    setNotes(await window.api.notes.list())
  }

  async function removeNote(id: number): Promise<void> {
    await window.api.notes.remove(id)
    setNotes(await window.api.notes.list())
  }

  async function toggleTheme(): Promise<void> {
    const next = settings.theme === 'dark' ? 'light' : 'dark'
    await window.api.settings.set('theme', next)
    setSettings(await window.api.settings.getAll(SETTING_DEFAULTS))
  }

  return (
    <div className="app" data-theme={settings.theme}>
      <h1>app-kit</h1>
      <p className="muted">雛形の動作確認。設定KV と Drizzle のマイグレーションを試すためのもの。</p>

      <section>
        <h2>設定KV</h2>
        <p>
          theme: <code>{settings.theme}</code> / accentColor: <code>{settings.accentColor}</code>
        </p>
        <button onClick={toggleTheme}>テーマを切り替えて保存</button>
        <p className="muted">再起動しても保持されていれば成功。</p>
      </section>

      <section>
        <h2>notes（{notes.length}件）</h2>
        <div className="row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="何か書いて Enter"
          />
          <button onClick={addNote}>追加</button>
        </div>
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <span>{n.body}</span>
              <button onClick={() => removeNote(n.id)}>×</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
