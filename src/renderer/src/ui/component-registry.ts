export type ComponentEntry = {
  id: 'accordion' | 'toggle' | 'panel' | 'card'
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
  { id: 'accordion', name: 'Accordion / Disclosure', purpose: '補足情報をその場で開閉する。', variants: '閉 / 開 / 無効', use: '設定や説明の段階的な開示。', avoid: '重要な状態や必須操作を閉じたまま隠す場面。', motion: 'AccordionReveal + DisclosureCaret', code: '<Accordion title="詳細">補足情報</Accordion>' },
  { id: 'toggle', name: 'Toggle', purpose: 'オン / オフの設定状態を切り替える。', variants: 'オン / オフ / 無効', use: '即時に反映される二値設定。', avoid: '送信や確定が必要な操作、三値以上の選択。', motion: 'ToggleThumbSlide', code: '<Toggle label="通知" checked={enabled} onCheckedChange={setEnabled} />' },
  { id: 'panel', name: 'Panel', purpose: 'Surfaceを宣言して内容をまとまりとして示す。', variants: 'Standard / Media Safe / Opaque Media、静止 / 登場', use: 'テキスト面、画像入り面、特殊合成面。', avoid: '画像や動画を含む面にStandard登場Motionを指定する場面。', motion: 'PanelEnterSubtle / PanelFadeInMediaSafe（enter指定時のみ）', code: '<Panel surface="media-safe" motion="enter">画像と説明</Panel>' },
  { id: 'card', name: 'Card', purpose: '情報のまとまりと操作可能性を明確に分ける。', variants: 'Static / Interactive / Disabled、Standard / Media Safe', use: 'テキスト中心の選択肢や静的な情報。', avoid: '画像入りCardにliftを適用する場面。複数操作を内包するCard。', motion: 'CardLiftSubtle（Standard Interactiveのみ）', code: '<Card interactive onClick={openDetails}>詳細を開く</Card>' }
]
