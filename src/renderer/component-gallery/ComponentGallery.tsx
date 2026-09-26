import { useState } from 'react'
import { Accordion, Button, Card, EmptyState, IconButton, Panel, TextField, Toggle } from '../src/ui'
import { components, type ComponentEntry } from '../src/ui/component-registry'

function Example({ id }: { id: ComponentEntry['id'] }): JSX.Element {
  const [enabled, setEnabled] = useState(false)
  const [selected, setSelected] = useState(false)
  const [buttonCount, setButtonCount] = useState(0)
  const [fieldValue, setFieldValue] = useState('')
  const [hasItems, setHasItems] = useState(false)
  if (id === 'accordion') return <div className="cg-stack">
    <Accordion title="詳細を表示">開いている間、内容へTabで移動できます。<Button size="compact" className="cg-inline-button">補足操作</Button></Accordion>
    <Accordion title="利用できない項目" disabled>内容はDOMに残ります。</Accordion>
  </div>
  if (id === 'toggle') return <div className="cg-stack">
    <Toggle label="通知を受け取る" description="設定はすぐに反映されます" checked={enabled} onCheckedChange={setEnabled} />
    <Toggle label="管理者が設定" checked disabled onCheckedChange={() => {}} />
  </div>
  if (id === 'panel') return <div className="cg-stack">
    <Panel surface="standard" motion="enter"><b>Standard</b><p>テキスト中心の面。登場時に少し上へ動きます。</p></Panel>
    <Panel surface="media-safe" motion="enter"><b>Media Safe</b><div className="cg-image" role="img" aria-label="画像入り面の例" /><p>画像を含む面。登場はopacityだけです。</p></Panel>
    <Panel surface="opaque-media"><b>Opaque Media</b><p>合成面を想定した静止状態。Motionは製品側で検証します。</p></Panel>
  </div>
  if (id === 'button') return <div className="cg-stack">
    <div className="cg-button-row"><Button variant="primary" onClick={() => setButtonCount((count) => count + 1)}>保存</Button><Button variant="secondary">キャンセル</Button><Button variant="ghost">詳細</Button><Button variant="danger">削除</Button></div>
    <div className="cg-button-row"><Button variant="primary" size="compact" icon="＋">追加</Button><Button size="compact">小さいボタン</Button><IconButton aria-label="閉じる">×</IconButton></div>
    <div className="cg-button-row"><Button variant="primary" disabled>保存できません</Button><IconButton aria-label="閉じる（無効）" disabled>×</IconButton></div>
    <output>保存操作: {buttonCount}回</output>
  </div>
  if (id === 'text-field') return <div className="cg-field-grid">
    <TextField label="標準の入力" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} />
    <TextField label="保存先" description="生成したファイルの保存先です" placeholder="フォルダー名を入力" required />
    <TextField label="変更できない値" defaultValue="既存の値" readOnly />
    <TextField label="利用できない項目" defaultValue="編集不可" disabled />
    <TextField label="検証エラー" description="入力値を確認してください" defaultValue="見つからないフォルダー" error="フォルダーが見つかりません" />
  </div>
  if (id === 'empty-state') return <div className="cg-stack">
    <Button onClick={() => setHasItems((value) => !value)}>{hasItems ? '空に戻す' : '項目を表示'}</Button>
    {hasItems
      ? <ul className="cg-item-list"><li>保存済みの項目</li></ul>
      : <EmptyState title="まだ項目がありません" description="上の操作から追加できます。" />}
  </div>
  return <div className="cg-stack">
    <Card><b>Static</b><p>情報を表示するだけのCardです。</p></Card>
    <Card interactive onClick={() => setSelected(!selected)}><b>Interactive / Standard</b><p>{selected ? '選択しました' : 'クリックまたはEnter / Spaceで選択'}</p></Card>
    <Card interactive surface="media-safe" onClick={() => setSelected(!selected)}><b>Interactive / Media Safe</b><div className="cg-image" role="img" aria-label="画像入りCardの例" /><p>画像入りではliftしません。</p></Card>
    <Card interactive disabled onClick={() => {}}><b>Disabled</b><p>操作できないCardです。</p></Card>
  </div>
}

export function ComponentGallery(): JSX.Element {
  const [selectedId, setSelectedId] = useState<ComponentEntry['id']>('accordion')
  const [replay, setReplay] = useState(0)
  const entry = components.find((component) => component.id === selectedId) ?? components[0]
  return <main className="cg-page">
    <header className="cg-header"><div><p className="cg-eyebrow">Component Gallery v1 / app-kit</p><h1>標準Componentの見本帳</h1><p>実物・状態・Surfaceを比較して、標準Componentを選ぶための開発用ページ</p></div><Button onClick={() => setReplay((value) => value + 1)}>登場を再生</Button></header>
    <div className="cg-layout">
      <nav className="cg-nav" aria-label="Component一覧">{components.map((component) => <button type="button" key={component.id} className={selectedId === component.id ? 'is-selected' : ''} onClick={() => { setSelectedId(component.id); setReplay((value) => value + 1) }}><span>{component.name}</span><small>{component.id}</small></button>)}</nav>
      <article className="cg-detail"><div className="cg-tags"><span>Core Component</span><span>{entry.id === 'panel' || entry.id === 'card' ? 'Standard / Media Safe' : 'Standard'}</span></div><h2>{entry.name}</h2><p>{entry.purpose}</p>
        <div className="cg-compare"><section className="cg-stage" data-ak-motion="normal" aria-label="通常の動き"><h3>Normal</h3><Example key={`${entry.id}-normal-${replay}`} id={entry.id} /></section><section className="cg-stage" data-ak-motion="reduce" aria-label="動きを抑える"><h3>Reduced Motion</h3><Example key={`${entry.id}-reduced-${replay}`} id={entry.id} /></section></div>
        <p className="cg-hint">Hoverはポインター、FocusはTabで確認できます。Reducedでも状態は文字とARIAで残ります。TextFieldとEmptyStateにはMotionを加えていません。</p>
        <dl className="cg-facts"><dt>状態 / Surface</dt><dd>{entry.variants}</dd><dt>推奨用途</dt><dd>{entry.use}</dd><dt>避ける場面</dt><dd>{entry.avoid}</dd><dt>{entry.id === 'button' || entry.id === 'text-field' || entry.id === 'empty-state' ? 'Motion / Feedback' : 'Core Motion'}</dt><dd>{entry.motion}</dd></dl>
        <h3>最小コード例</h3><pre><code>{entry.code}</code></pre>
      </article>
    </div>
  </main>
}
