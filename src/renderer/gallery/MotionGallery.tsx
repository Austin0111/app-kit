import { useState } from 'react'
import { motions } from '../src/motion/registry'
import { MotionPreview } from './MotionPreview'

export function MotionGallery(): JSX.Element {
  const [selectedId, setSelectedId] = useState(motions[0].id)
  const [replay, setReplay] = useState(0)
  const motion = motions.find((entry) => entry.id === selectedId) ?? motions[0]
  return <main className="mg-page">
    <header className="mg-header"><div><p className="mg-eyebrow">Proofline Works / app-kit</p><h1>Motion Gallery v1</h1><p>比較・評価・指示・昇格判断のための開発用ページ</p></div><button type="button" onClick={() => setReplay((value) => value + 1)}>Replay both</button></header>
    <div className="mg-layout">
      <nav className="mg-nav" aria-label="Motion一覧">{(['Core', 'Lab', 'Recipe'] as const).map((status) => <div key={status}><h2>{status}</h2>{motions.filter((entry) => entry.status === status).map((entry) => <button type="button" key={entry.id} className={entry.id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(entry.id); setReplay((value) => value + 1) }}>{entry.name}</button>)}</div>)}</nav>
      <article className="mg-detail"><div className="mg-detail-head"><div><div className="mg-tags"><span>{motion.status}</span><span>{motion.kind}</span><span>{motion.surface}</span></div><h2>{motion.name}</h2></div><small>{motion.id}</small></div>
        <div className="mg-compare"><MotionPreview key={`${motion.id}-normal-${replay}`} motion={motion} reduced={false} replay={replay} /><MotionPreview key={`${motion.id}-reduced-${replay}`} motion={motion} reduced replay={replay} /></div>
        {motion.id.startsWith('toast-') && <div className="mg-toast-variants" key={`toast-variants-${replay}`} aria-label="Toast比較">
          <h3>Toast比較</h3><div className="mg-toast-variant-grid">
            <div><b>ToastEnterCompact</b><p>app-kit現行 / Enter 140ms</p><span className="mg-toast ak-motion-toast-compact">保存しました</span></div>
            <div><b>ToastRiseIn</b><p>VideoDeck / Enter 200ms</p><span className="mg-toast ak-motion-toast-rise-in">保存しました</span></div>
            <div><b>ToastDropOut</b><p>VideoDeck / Exit 180ms</p><span className="mg-toast ak-motion-toast-drop-out">保存しました</span></div>
          </div>
        </div>}
        <dl className="mg-facts"><dt>Intent</dt><dd>{motion.intent}</dd><dt>推奨用途</dt><dd>{motion.use}</dd><dt>避ける場面</dt><dd>{motion.avoid}</dd><dt>主要パラメータ</dt><dd>{motion.parameters}</dd><dt>Reduced Motion</dt><dd>{motion.reduced}</dd><dt>Reference</dt><dd>{motion.reference}</dd></dl>
        <h3>最小コード例</h3><pre><code>{motion.code}</code></pre>
        {motion.id.startsWith('toast-') && <p className="mg-note">ToastEnterCompactは現行app-kitの比較対象。ToastRiseIn / ToastDropOutはVideoDeck由来。既存Toastの挙動は変更していません。</p>}
      </article>
    </div>
  </main>
}
