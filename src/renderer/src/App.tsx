import { useEffect, useState } from 'react'
import type { Api } from '../../preload'
import { useSettings } from './useSettings'
import { EmptyState, useDialog, useToast, TextField, TitleBar, VersionBadge } from './ui'
import { DISPLAY_NAME, IS_TEMPLATE } from '../../shared/app-meta'

declare global {
  interface Window {
    api: Api
  }
}

type Note = { id: number; body: string; createdAt: string; done: boolean }
type BackupEntry = { path: string; name: string; size: number; createdAt: string }

/** 秘密情報の状態を、素人にも分かる言葉にする。 */
const SECRET_LABEL: Record<string, string> = {
  unset: '未設定',
  ok: '設定済み',
  plaintext: '設定済み（この環境では暗号化できず平文で保存）',
  undecryptable: '復号できない。入れ直しが要る（別PCへ復元した等）'
}

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
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('unset')
  // エラー境界が働くかを確かめるための仕掛け。真になると描画が失敗する。
  // 検証用なので配布版では触れない（下のボタンを出さない）
  const [boom, setBoom] = useState(false)
  if (boom) throw new Error('確認用: わざと描画に失敗させた')

  useEffect(() => {
    window.api.notes.list().then((items) => { setNotes(items); setNotesLoaded(true) })
    window.api.backup.list().then(setBackups)
    window.api.secrets.status('demoApiKey').then(setApiKeyStatus)
  }, [])

  async function showChangelog(): Promise<void> {
    const text = await window.api.app.changelog()
    if (!text) {
      toast.error('更新履歴を読めなかった')
      return
    }
    // 既存のダイアログ基盤に乗せる。専用の画面は作らない
    await dialog.open({
      title: '更新履歴',
      message: <pre className="changelog">{text}</pre>,
      buttons: [{ value: 'close', label: '閉じる', primary: true }]
    })
  }

  async function setApiKey(): Promise<void> {
    // 入力欄の値は保存後すぐ捨てられる。読み出す口は無いので main 側でしか使えない
    const key = await dialog.prompt('APIキーを設定する', {
      placeholder: 'sk-...',
      message: 'OSの仕組みで暗号化して保存する。別のPCでは復号できない点に注意。'
    })
    if (key === null) return
    if (!key.trim()) {
      toast.error('空では保存できぬ')
      return
    }
    await window.api.secrets.set('demoApiKey', key.trim())
    setApiKeyStatus(await window.api.secrets.status('demoApiKey'))
    toast.success('APIキーを保存した')
  }

  async function clearApiKey(): Promise<void> {
    await window.api.secrets.clear('demoApiKey')
    setApiKeyStatus(await window.api.secrets.status('demoApiKey'))
    toast.success('APIキーを消した')
  }

  async function createBackup(): Promise<void> {
    try {
      await window.api.backup.create()
      setBackups(await window.api.backup.list())
      toast.success('バックアップを取った')
    } catch (err) {
      toast.error(`バックアップに失敗した: ${String(err)}`)
    }
  }

  async function createDiagnostics(): Promise<void> {
    try {
      const name = await window.api.diagnostics.create()
      toast.success(`診断情報を作成した: ${name}`)
    } catch (err) {
      toast.error(`診断情報の作成に失敗した: ${String(err)}`)
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
      className="app-shell"
      data-theme={settings.theme}
      style={{ '--accent': settings.accentColor } as React.CSSProperties}
    >
      <TitleBar title={DISPLAY_NAME}>
        <VersionBadge onShowChangelog={showChangelog} />
      </TitleBar>
      <main className="app">
        <div className="app__content">
          <h1>{DISPLAY_NAME}</h1>
          <p className="muted">
            雛形の動作確認。{loaded ? '設定を読み込み済み' : '設定を読み込み中…'}
          </p>

          {window.location.protocol === 'http:' && IS_TEMPLATE && (
            <section aria-labelledby="design-system-heading">
              <h2 id="design-system-heading">デザインシステム</h2>
              <a className="design-system__link" href="/gallery.html" target="_blank" rel="noopener noreferrer">
                動きの見本帳（Motion Gallery）を開く
              </a>
              <a className="design-system__link" href="/component-gallery.html" target="_blank" rel="noopener noreferrer">
                標準Componentの見本帳を開く
              </a>
            </section>
          )}

          <section>
            <h2>設定KV</h2>
            <div className="row">
              <button
                onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              >
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
              いずれも即座に保存される。<strong>ウィンドウの位置・サイズも記憶する</strong>
              ので、 動かして閉じて開き直すと同じ場所に出る。
            </p>
          </section>

          <section>
            <h2>秘密情報（APIキー等）</h2>
            <p className={apiKeyStatus === 'undecryptable' ? 'warn' : 'muted'}>
              状態: {SECRET_LABEL[apiKeyStatus] ?? apiKeyStatus}
            </p>
            <div className="row">
              <button onClick={setApiKey}>
                {apiKeyStatus === 'unset' ? '設定する' : '入れ直す'}
              </button>
              {apiKeyStatus !== 'unset' && <button onClick={clearApiKey}>消す</button>}
            </div>
            <p className="muted">
              OSの仕組み（Windows は DPAPI）で暗号化して保存する。
              <strong>値を読み出す口は用意していない</strong>ので、使う処理は main 側に置く。
            </p>
          </section>

          <section>
            <h2>notes（{notes.length}件）</h2>
            <div className="row notes__entry">
              <TextField
                className="notes__field"
                label="メモの内容"
                description="Enterキーでも追加できます"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="何か書いて Enter"
              />
              <button onClick={addNote}>追加</button>
            </div>
            {notesLoaded && notes.length === 0 && <EmptyState title="まだメモがありません" description="上の入力欄からメモを追加できます。" />}
            {notes.length > 0 && <ul>
              {notes.map((n) => (
                <li key={n.id}>
                  <span>{n.body}</span>
                  <span className="row">
                    <button onClick={() => renameNote(n)}>編集</button>
                    <button onClick={() => removeNote(n)}>×</button>
                  </span>
                </li>
              ))}
            </ul>}
          </section>

          <section>
            <h2>バックアップ（{backups.length}世代）</h2>
            <div className="row backup-actions">
              <button onClick={createBackup}>今すぐバックアップ</button>
              <button onClick={() => window.api.backup.openFolder()}>フォルダを開く</button>
              <button onClick={() => window.api.log.openFolder()}>ログを開く</button>
              <button onClick={createDiagnostics}>診断情報ZIPを作る</button>
              {window.api.isE2E && (
                <button onClick={() => setBoom(true)}>描画を壊す（確認用）</button>
              )}
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
        </div>
      </main>

      {settings.showStatusBar && (
        <footer className="statusbar">
          theme={settings.theme} / accent={settings.accentColor} / notes={notes.length}
        </footer>
      )}
    </div>
  )
}
