import { useEffect, useState } from 'react'
import type { Api } from '../../preload'
import { useSettings } from './useSettings'
import { useDialog, useToast, TitleBar } from './ui'

declare global {
  interface Window {
    api: Api
  }
}

type Note = { id: number; body: string; createdAt: string; done: boolean }
type BackupEntry = { path: string; name: string; size: number; createdAt: string }

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function App(): JSX.Element {
  const { settings, update, loaded } = useSettings()
  const toast = useToast()
  const dialog = useDialog()
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')
  const [backups, setBackups] = useState<BackupEntry[]>([])

  useEffect(() => {
    window.api.notes.list().then(setNotes)
    window.api.backup.list().then(setBackups)
  }, [])

  async function createBackup(): Promise<void> {
    try {
      await window.api.backup.create()
      setBackups(await window.api.backup.list())
      toast.success('バックアップを取った')
    } catch (err) {
      toast.error(`バックアップに失敗した: ${String(err)}`)
    }
  }

  async function restoreBackup(entry: BackupEntry): Promise<void> {
    const ok = await dialog.confirm(
      'このバックアップで現在のデータを置き換える',
      `${entry.name}（${formatSize(entry.size)}）を復元する。現在のデータは失われ、アプリは再起動する。`,
      { okLabel: '復元して再起動', danger: true }
    )
    if (!ok) return
    await window.api.backup.restore(entry.path)
  }

  async function addNote(): Promise<void> {
    const body = draft.trim()
    if (!body) return
    await window.api.notes.add(body)
    setDraft('')
    setNotes(await window.api.notes.list())
  }

  async function renameNote(note: Note): Promise<void> {
    const next = await dialog.prompt('内容を書き換える', { initial: note.body })
    if (next === null) return
    if (!next.trim()) {
      toast.error('空にはできぬ')
      return
    }
    await window.api.notes.update(note.id, next.trim())
    setNotes(await window.api.notes.list())
  }

  async function removeNote(note: Note): Promise<void> {
    const ok = await dialog.confirm('この項目を削除する', note.body, {
      okLabel: '削除',
      danger: true
    })
    if (!ok) return
    await window.api.notes.remove(note.id)
    setNotes(await window.api.notes.list())
    toast.success('削除した')
  }

  return (
    <div
      className="app"
      data-theme={settings.theme}
      style={{ '--accent': settings.accentColor } as React.CSSProperties}
    >
      <TitleBar title="app-kit" />
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
              <span className="row">
                <button onClick={() => renameNote(n)}>編集</button>
                <button onClick={() => removeNote(n)}>×</button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>バックアップ（{backups.length}世代）</h2>
        <div className="row">
          <button onClick={createBackup}>今すぐバックアップ</button>
          <button onClick={() => window.api.backup.openFolder()}>フォルダを開く</button>
        </div>
        <p className="muted">
          {settings.backupIntervalDays > 0
            ? `起動時に自動チェック（${settings.backupIntervalDays}日間隔・${settings.backupRetention}世代まで保持）`
            : '自動バックアップは無効'}
          。復元は再起動して適用される。
        </p>
        <ul>
          {backups.map((b) => (
            <li key={b.path}>
              <span>
                {b.name}
                <span className="muted"> — {formatSize(b.size)}</span>
              </span>
              <button onClick={() => restoreBackup(b)}>復元</button>
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
