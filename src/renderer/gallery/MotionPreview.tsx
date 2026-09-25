import { useEffect, useState } from 'react'
import type { MotionEntry } from '../src/motion/registry'
import { ImageFirstPaint } from '../src/motion/behaviors/ImageFirstPaint'

const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="110"><rect width="240" height="110" fill="#576c88"/><circle cx="60" cy="50" r="24" fill="#b6c9dd"/><path d="M0 110 110 40 240 110" fill="#8da7bd"/></svg>')

export function MotionPreview({ motion, reduced, replay }: { motion: MotionEntry; reduced: boolean; replay: number }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [imageUpdates, setImageUpdates] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const basic = (className: string, children: React.ReactNode): JSX.Element => <div className={`mg-sample ${className}`}>{children}</div>
  let content: JSX.Element
  switch (motion.id) {
    case 'panel-media-safe': content = basic('ak-motion-panel-media-safe', <><img src={image} alt="サンプル風景" /><span>画像を含むパネル</span></>); break
    case 'panel-subtle': content = basic('ak-motion-panel-enter-subtle', <>設定内容が切り替わりました</>); break
    case 'toast-compact': content = basic('ak-motion-toast-compact mg-toast', '保存しました'); break
    case 'toast-rise': content = basic('ak-motion-toast-rise-in mg-toast', '保存しました'); break
    case 'toast-drop': content = basic('ak-motion-toast-drop-out mg-toast', '保存しました'); break
    case 'accordion': content = <div><button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>詳細 {open ? '開' : '閉'}</button><div className="ak-motion-accordion" data-open={open}><div className="ak-motion-accordion-content"><p>内容はDOM内に保持されます。</p></div></div></div>; break
    case 'caret': content = <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}><span className="ak-motion-caret" data-open={open}>›</span> 詳細 {open ? '開' : '閉'}</button>; break
    case 'segment': content = <div className="mg-segments"><span className="ak-motion-segment-indicator" style={{ transform: `translateX(${selected * 100}%)` }} /><button type="button" aria-pressed={selected === 0} onClick={() => setSelected(0)}>一覧</button><button type="button" aria-pressed={selected === 1} onClick={() => setSelected(1)}>詳細</button></div>; break
    case 'toggle': content = <button className="mg-switch" type="button" role="switch" aria-checked={open} data-on={open} onClick={() => setOpen(!open)}><span className="ak-motion-toggle-thumb" data-on={open} />{open ? 'ON' : 'OFF'}</button>; break
    case 'image-first': content = <div className="mg-image"><ImageFirstPaint src={image} alt="初回表示のサンプル" /><button type="button" onClick={() => setImageUpdates(imageUpdates + 1)}>再描画 {imageUpdates}</button></div>; break
    case 'card-lift': content = <button type="button" className="mg-sample ak-motion-card-lift">カーソルを合わせる / フォーカスする</button>; break
    default: content = <p className="mg-pending">この項目は設計・評価段階。Coreプレビューは未実装。</p>
  }
  return <div key={`${motion.id}-${replay}`} className="mg-stage" data-ak-motion={reduced ? 'reduce' : 'normal'} data-testid={`preview-${reduced ? 'reduced' : 'normal'}`}>
    <span className="mg-stage-label">{reduced ? 'Reduced' : 'Normal'}</span>{content}
  </div>
}
