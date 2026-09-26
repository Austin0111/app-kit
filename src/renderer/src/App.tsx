import { useEffect, useState } from 'react'
import type { Api } from '../../preload'
import { useSettings } from './useSettings'
import { Button, EmptyState, IconButton, TextField, Toggle, TitleBar, VersionBadge, useDialog, useToast } from './ui'
import { DISPLAY_NAME, IS_TEMPLATE } from '../../shared/app-meta'

declare global {
  interface Window {
    api: Api
  }
}

type Note = { id: number; body: string; createdAt: string; done: boolean }
type BackupEntry = { path: string; name: string; size: number; createdAt: string }
type BackupListState =
  | { status: 'loading' }
  | { status: 'loaded'; items: BackupEntry[] }
  | { status: 'error' }

/** 秘密情報の状態を、素人にも分かる言葉にする。 */
const SECRET_LABEL: Record<string, string> = {
  loading: '確認中…',
  unset: '未設定',
  ok: '設定済み',
  plaintext: '設定済み（この環境では暗号化できず平文で保存）',
  undecryptable: '復号できない。入れ直しが要る（別PCへ復元した等）',
  error: '状態を確認できませんでした'
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function App(): JSX.Element {
  const { settings, update, loaded, error: settingsError, reload: reloadSettings } = useSettings()
  const toast = useToast()
  const dialog = useDialog()
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [backupList, setBackupList] = useState<BackupListState>({ status: 'loading' })
  const backups = backupList.status === 'loaded' ? backupList.items : []
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('loading')
  // エラー境界が働くかを確かめるための仕掛け。真になると描画が失敗する。
  // 検証用なので配布版では触れない（下のボタンを出さない）
  const [boom, setBoom] = useState(false)
  if (boom) throw new Error('確認用: わざと描画に失敗させた')

  useEffect(() => {
    let active = true
    window.api.notes.list().then((items) => { setNotes(items); setNotesLoaded(true) })
    window.api.backup.list()
      .then((items) => { if (active) setBackupList({ status: 'loaded', items }) })
      .catch(() => { if (active) setBackupList({ status: 'error' }) })
    window.api.secrets.status('demoApiKey')
      .then((status) => { if (active) setApiKeyStatus(status) })
      .catch(() => { if (active) setApiKeyStatus('error') })
    return () => { active = false }
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
    try {
      await window.api.secrets.set('demoApiKey', key.trim())
      setApiKeyStatus(await window.api.secrets.status('demoApiKey'))
      toast.success('APIキーを保存した')
    } catch {
      toast.error('APIキーを保存できませんでした')
    }
  }

  async function clearApiKey(): Promise<void> {
    try {
      await window.api.secrets.clear('demoApiKey')
      setApiKeyStatus(await window.api.secrets.status('demoApiKey'))
      toast.success('APIキーを消した')
    } catch {
      toast.error('APIキーを消せませんでした')
    }
  }

  async function refreshApiKeyStatus(): Promise<void> {
    setApiKeyStatus('loading')
    try {
      setApiKeyStatus(await window.api.secrets.status('demoApiKey'))
    } catch {
      setApiKeyStatus('error')
    }
  }

  async function createBackup(): Promise<void> {
    try {
      await window.api.backup.create()
      setBackupList({ status: 'loaded', items: await window.api.backup.list() })
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

          {/* APP_KIT_DEVELOPMENT_ENTRY_START */}
          {window.location.protocol === 'http:' && IS_TEMPLATE && (
            <section aria-labelledby="design-system-heading">
              <h2 id="design-system-heading">デザインシステム</h2>
              <a className="design-system__link" href="/gallery.html" target="_blank" rel="noopener noreferrer">
                動きの見本帳（Motion Gallery）を開く
              </a>
              <a className="design-system__link" href="/component-gallery.html" target="_blank" rel="noopener noreferrer">
                標準Componentの見本帳を開く
              </a>
              <a className="design-system__link" href="/foundation-gallery.html" target="_blank" rel="noopener noreferrer">
                標準Foundationの見本帳を開く
              </a>
            </section>
          )}
          {/* APP_KIT_DEVELOPMENT_ENTRY_END */}

          <section>
            <h2>設定KV</h2>
            <div className="settings-controls">
              <div className="settings-control">
                <label htmlFor="setting-theme">テーマ</label>
                <select id="setting-theme" value={settings.theme} disabled={!loaded}
                  onChange={(e) => update({ theme: e.target.value as typeof settings.theme })}>
                  <option value="dark">ダーク</option>
                  <option value="light">ライト</option>
                </select>
              </div>
              <div className="settings-control">
                <label htmlFor="setting-accent">アクセント色</label>
                <input id="setting-accent" type="color" value={settings.accentColor}
                  disabled={!loaded} onChange={(e) => update({ accentColor: e.target.value })} />
              </div>
              <Toggle className="settings-toggle" label="ステータスバーを表示"
                description="切り替えるとすぐに反映・保存されます"
                checked={settings.showStatusBar} disabled={!loaded}
                onCheckedChange={(checked) => update({ showStatusBar: checked })} />
            </div>
            {settingsError && <p className="warn" role="alert">{settingsError} <Button size="compact" onClick={reloadSettings}>再読込</Button></p>}
            <p className="muted">
              いずれも即座に保存される。<strong>ウィンドウの位置・サイズも記憶する</strong>
              ので、 動かして閉じて開き直すと同じ場所に出る。
            </p>
          </section>

          <section>
            <h2>秘密情報（APIキー等）</h2>
            <p className={apiKeyStatus === 'undecryptable' || apiKeyStatus === 'error' ? 'warn' : 'muted'} role={apiKeyStatus === 'error' ? 'alert' : 'status'}>
              状態: {SECRET_LABEL[apiKeyStatus] ?? apiKeyStatus}
            </p>
            <div className="row">
              <Button onClick={setApiKey} disabled={apiKeyStatus === 'loading'}>
                {apiKeyStatus === 'unset' || apiKeyStatus === 'error' ? '設定する' : '入れ直す'}
              </Button>
              {apiKeyStatus === 'error' && <Button onClick={refreshApiKeyStatus}>状態を再確認</Button>}
              {!['loading', 'unset', 'error'].includes(apiKeyStatus) && <Button variant="danger" onClick={clearApiKey}>消す</Button>}
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
              <Button variant="primary" onClick={addNote}>追加</Button>
            </div>
            {notesLoaded && notes.length === 0 && <EmptyState title="まだメモがありません" description="上の入力欄からメモを追加できます。" />}
            {notes.length > 0 && <ul>
              {notes.map((n) => (
                <li key={n.id}>
                  <span>{n.body}</span>
                  <span className="row">
                    <button onClick={() => renameNote(n)}>編集</button>
                    <IconButton aria-label={`${n.body}を削除`} onClick={() => removeNote(n)}>×</IconButton>
                  </span>
                </li>
              ))}
            </ul>}
          </section>

          <section>
            <h2>バックアップ（{backupList.status === 'loaded' ? `${backups.length}世代` : backupList.status === 'loading' ? '読み込み中' : '取得失敗'}）</h2>
            <div className="row backup-actions">
              <Button variant="primary" onClick={createBackup} disabled={backupList.status === 'loading'}>今すぐバックアップ</Button>
              <Button onClick={() => window.api.backup.openFolder()}>フォルダを開く</Button>
              <Button onClick={() => window.api.log.openFolder()}>ログを開く</Button>
              <Button onClick={createDiagnostics}>診断情報ZIPを作る</Button>
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
            {backupList.status === 'loading' && <p className="muted" role="status">バックアップを読み込み中…</p>}
            {backupList.status === 'error' && <p className="warn" role="alert">バックアップ一覧を読み込めませんでした。</p>}
            {backupList.status === 'loaded' && backups.length === 0 && <EmptyState title="まだバックアップがありません" description="「今すぐバックアップ」から作成できます。" />}
            {backupList.status === 'loaded' && backups.length > 0 && <ul>
              {backups.map((b) => (
                <li key={b.path}>
                  <span>
                    {b.name}
                    <span className="muted"> — {formatSize(b.size)}</span>
                  </span>
                  <button onClick={() => restoreBackup(b)}>復元</button>
                </li>
              ))}
            </ul>}
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
