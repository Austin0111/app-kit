import { useState } from 'react'
import { motions, motionDisplayNames, motionKindLabels, motionStatusLabels, motionSurfaceLabels, toastComparisonNotes } from '../src/motion/registry'
import { MotionPreview } from './MotionPreview'

const toastComparison = ['toast-compact', 'toast-rise', 'toast-drop'] as const

export function MotionGallery(): JSX.Element {
  const [selectedId, setSelectedId] = useState(motions[0].id)
  const [replay, setReplay] = useState(0)
  const [copied, setCopied] = useState(false)
  const motion = motions.find((entry) => entry.id === selectedId) ?? motions[0]
  const toastMotions = toastComparison.map((id) => motions.find((entry) => entry.id === id)!)

  async function copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(motion.name)
      setCopied(true)
    } catch {
      const input = document.createElement('textarea')
      input.value = motion.name
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      const success = document.execCommand('copy')
      input.remove()
      setCopied(success)
    }
  }

  return <main className="mg-page">
    <header className="mg-header"><div><p className="mg-eyebrow">Motion Gallery v1 / app-kit</p><h1>動きの見本帳</h1><p>比較・評価・指示・昇格判断のための開発用ページ</p></div><button type="button" onClick={() => setReplay((value) => value + 1)}>両方再生</button></header>
    <div className="mg-layout">
      <nav className="mg-nav" aria-label="Motion一覧">{(['Core', 'Lab', 'Recipe'] as const).map((status) => <div key={status}><h2>{motionStatusLabels[status]} <small>（{status}）</small></h2>{motions.filter((entry) => entry.status === status).map((entry) => <button type="button" key={entry.id} className={entry.id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(entry.id); setCopied(false); setReplay((value) => value + 1) }}><span>{motionDisplayNames[entry.name]}</span><small>{entry.name}</small></button>)}</div>)}</nav>
      <article className="mg-detail"><div className="mg-detail-head"><div><div className="mg-tags"><span title={motion.status}>{motionStatusLabels[motion.status]}</span><span title={motion.kind}>{motionKindLabels[motion.kind]}</span><span title={motion.surface}>{motionSurfaceLabels[motion.surface]}</span></div><h2>{motionDisplayNames[motion.name]}</h2><div className="mg-id-row"><code title="正式ID">{motion.name}</code><button type="button" onClick={copyId} aria-label={`${motion.name}をコピー`}>IDをコピー</button><span role="status">{copied ? 'コピーしました' : ''}</span></div></div><small className="mg-internal-id" title="registry ID">{motion.id}</small></div>
        <div className="mg-compare"><MotionPreview key={`${motion.id}-normal-${replay}`} motion={motion} reduced={false} replay={replay} /><MotionPreview key={`${motion.id}-reduced-${replay}`} motion={motion} reduced replay={replay} /></div>
        {motion.id.startsWith('toast-') && <div className="mg-toast-variants" key={`toast-variants-${replay}`} aria-label="Toast比較">
          <h3>通知の動き比較</h3><div className="mg-toast-variant-grid">
            {toastMotions.map((entry) => <div key={entry.id}><b>{motionDisplayNames[entry.name]}</b><small>{entry.name}</small><p>{toastComparisonNotes[entry.id as keyof typeof toastComparisonNotes]}</p><span className={`mg-toast ${entry.id === 'toast-compact' ? 'ak-motion-toast-compact' : entry.id === 'toast-rise' ? 'ak-motion-toast-rise-in' : 'ak-motion-toast-drop-out'}`}>保存しました</span></div>)}
          </div>
        </div>}
        <dl className="mg-facts"><dt>ねらい</dt><dd>{motion.intent}</dd><dt>推奨用途</dt><dd>{motion.use}</dd><dt>避ける場面</dt><dd>{motion.avoid}</dd><dt>主要パラメータ</dt><dd>{motion.parameters}</dd><dt>動きを抑えた場合</dt><dd>{motion.reduced}</dd><dt>参照元</dt><dd>{motion.reference}</dd></dl>
        <h3>最小コード例</h3><pre><code>{motion.code}</code></pre>
        {motion.id.startsWith('toast-') && <p className="mg-note">控えめな通知・登場は現行app-kitの比較対象。通知の強調・登場／通知・退場はVideoDeck由来。既存Toastの挙動は変更していません。</p>}
      </article>
    </div>
  </main>
}
