import { useEffect, useState } from 'react'
import type { Api } from '../../preload'
import { useSettings } from './useSettings'

declare global {
  interface Window {
    api: Api
  }
}

type Note = { id: number; body: string; createdAt: string; done: boolean }

export default function App(): JSX.Element {
  const { settings, update, loaded } = useSettings()
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
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

  return (
    <div
      className="app"
      data-theme={settings.theme}
      style={{ '--accent': settings.accentColor } as React.CSSProperties}
    >
      <h1>app-kit</h1>
      <p className="muted">
        雛形の動作確認。{loaded ? '設定を読み込み済み' : '設定を読み込み中…'}
      </p>

      <section>
        <h2>設定KV</h2>
        <div className="row">
          <button onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
            テーマ: {settings.theme}
          </button>
          <input
            type="color"
            value={settings.accentColor}
            onChange={(e) => update({ accentColor: e.target.value })}
            title="アクセント色"
          />
          <button onClick={() => update({ showStatusBar: !settings.showStatusBar })}>
            ステータスバー: {settings.showStatusBar ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="muted">
          いずれも即座に保存される。<strong>ウィンドウの位置・サイズも記憶する</strong>ので、
          動かして閉じて開き直すと同じ場所に出る。
        </p>
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

      {settings.showStatusBar && (
        <footer className="statusbar">
          theme={settings.theme} / accent={settings.accentColor} / notes={notes.length}
        </footer>
      )}
    </div>
  )
}
