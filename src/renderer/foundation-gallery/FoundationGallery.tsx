type FoundationEntry = {
  id: string
  name: string
  purpose: string
  example: string
  sample: 'spacing' | 'control' | 'surface' | 'focus-width' | 'focus-offset' | 'warning' | 'supporting'
}

const entries: readonly FoundationEntry[] = [
  { id: '--ak-foundation-space-related', name: '関連操作の間隔', purpose: '並ぶ操作や短い関連要素の間隔。', example: 'gap: var(--ak-foundation-space-related);', sample: 'spacing' },
  { id: '--ak-foundation-radius-control', name: '操作部品の角丸', purpose: 'ButtonとTextFieldなど、小さな操作部品。', example: 'border-radius: var(--ak-foundation-radius-control);', sample: 'control' },
  { id: '--ak-foundation-radius-surface', name: '情報面の角丸', purpose: 'Panel、Card、EmptyStateなどの情報面。', example: 'border-radius: var(--ak-foundation-radius-surface);', sample: 'surface' },
  { id: '--ak-foundation-focus-width', name: 'フォーカス輪郭の太さ', purpose: 'キーボード操作時の明確な輪郭。', example: 'outline: var(--ak-foundation-focus-width) solid var(--accent);', sample: 'focus-width' },
  { id: '--ak-foundation-focus-offset', name: 'フォーカス輪郭の距離', purpose: '通常の操作部品で輪郭を本体から離す幅。', example: 'outline-offset: var(--ak-foundation-focus-offset);', sample: 'focus-offset' },
  { id: '--ak-foundation-color-warning', name: '警告の文字色', purpose: '対応が必要な状態と描画失敗の警告。', example: 'color: var(--ak-foundation-color-warning);', sample: 'warning' },
  { id: '--ak-foundation-type-supporting', name: '補助文の文字サイズ', purpose: '説明文や補助的な状態表示。', example: 'font-size: var(--ak-foundation-type-supporting);', sample: 'supporting' }
]

function Sample({ type }: { type: FoundationEntry['sample'] }): JSX.Element {
  if (type === 'spacing') return <div className="fg-sample fg-sample--spacing"><span>操作 A</span><span>操作 B</span></div>
  if (type === 'control') return <div className="fg-sample fg-sample--control">操作部品</div>
  if (type === 'surface') return <div className="fg-sample fg-sample--surface">情報のまとまり</div>
  if (type === 'focus-width' || type === 'focus-offset') return <button type="button" className="fg-sample fg-sample--focus">Tabでフォーカスを確認</button>
  if (type === 'warning') return <div className="fg-sample fg-sample--warning">確認が必要です</div>
  return <div className="fg-sample fg-sample--supporting">操作を補足する説明文</div>
}

export function FoundationGallery(): JSX.Element {
  const style = getComputedStyle(document.documentElement)
  return <main className="fg-page">
    <header className="fg-header"><small>FOUNDATION GALLERY V1 / APP-KIT</small><h1>標準Foundationの見本帳</h1><p>実装で使われている基礎値を、名前・実値・用途で確認する開発用ページです。</p></header>
    <p className="fg-note">Foundation → Component → Motion / Interaction → Product UI。輪郭・角丸・間隔・文字色にMotionはなく、Reduced Motionでも同じ状態を示します。</p>
    <div className="fg-grid">{entries.map((entry) => <section className="fg-card" key={entry.id}>
      <h2>{entry.name}</h2><code className="fg-id">{entry.id}</code>
      <dl><dt>実値</dt><dd>{style.getPropertyValue(entry.id).trim()}</dd><dt>用途</dt><dd>{entry.purpose}</dd></dl>
      <div className="fg-preview" aria-label={`${entry.name}の使用例`}><Sample type={entry.sample} /></div>
      <pre><code>{entry.example}</code></pre>
    </section>)}</div>
  </main>
}
