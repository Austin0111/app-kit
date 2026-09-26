export type ComponentEntry = {
  id: 'accordion' | 'toggle' | 'panel' | 'card' | 'button' | 'text-field' | 'empty-state'
  name: string
  purpose: string
  variants: string
  use: string
  avoid: string
  motion: string
  code: string
}

/** Shared labels for the development gallery and generated-app documentation. */
export const components: readonly ComponentEntry[] = [
  { id: 'accordion', name: '開閉パネル（Accordion）', purpose: '補足情報をその場で開閉する。', variants: '閉 / 開 / 無効', use: '設定や説明の段階的な開示。', avoid: '重要な状態や必須操作を閉じたまま隠す場面。', motion: 'AccordionReveal + DisclosureCaret', code: '<Accordion title="詳細">補足情報</Accordion>' },
  { id: 'toggle', name: '切替（Toggle）', purpose: 'オン / オフの設定状態を切り替える。', variants: 'オン / オフ / 無効', use: '即時に反映される二値設定。', avoid: '送信や確定が必要な操作、三値以上の選択。', motion: 'ToggleThumbSlide', code: '<Toggle label="通知" checked={enabled} onCheckedChange={setEnabled} />' },
  { id: 'panel', name: 'パネル（Panel）', purpose: 'Surfaceを宣言して内容をまとまりとして示す。', variants: 'Standard / Media Safe / Opaque Media、静止 / 登場', use: 'テキスト面、画像入り面、特殊合成面。', avoid: '画像や動画を含む面にStandard登場Motionを指定する場面。', motion: 'PanelEnterSubtle / PanelFadeInMediaSafe（enter指定時のみ）', code: '<Panel surface="media-safe" motion="enter">画像と説明</Panel>' },
  { id: 'card', name: 'カード（Card）', purpose: '情報のまとまりと操作可能性を明確に分ける。', variants: 'Static / Interactive / Disabled、Standard / Media Safe', use: 'テキスト中心の選択肢や静的な情報。', avoid: '画像入りCardにliftを適用する場面。複数操作を内包するCard。', motion: 'CardLiftSubtle（Standard Interactiveのみ）', code: '<Card interactive onClick={openDetails}>詳細を開く</Card>' },
  { id: 'button', name: 'ボタン（Button）', purpose: '確定・補助・軽い操作の優先度を揃える。', variants: 'Primary / Secondary / Ghost / Danger、Standard / Compact、Disabled / Icon', use: '保存、追加、補助操作、破壊的な操作。', avoid: '二値設定はToggle、画面遷移はリンク、タイトルバー等の専用操作。', motion: 'fast tokenによる色の反応。押下は即時。', code: '<Button variant="primary" icon={<span>＋</span>}>追加</Button>' },
  { id: 'text-field', name: 'テキスト入力（TextField）', purpose: '単一行テキストの名前・説明・エラーを一体として伝える。', variants: 'Default / Required / Disabled / Readonly / Invalid、Standard', use: '設定名や短い自由入力。', avoid: '検索・数値・パスワード・複数行・選択肢の入力。', motion: 'なし。Focus・Invalidは静的な輪郭と文言。', code: '<TextField label="保存先" description="生成したファイルの保存先です" error={error} />' },
  { id: 'empty-state', name: '空状態（EmptyState）', purpose: '読み込み済みの一覧が空であることと次の操作を伝える。', variants: '空 / 内容あり、Standard', use: 'メモやバックアップなど、空になる一覧。', avoid: '読み込み中・失敗状態、内容がある一覧、単なる余白埋め。', motion: 'なし。状態は文字とstatusで伝える。', code: '<EmptyState title="まだ項目がありません" description="上の操作から追加できます。" />' }
]
