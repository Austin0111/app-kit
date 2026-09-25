# Proofline UI Component System v1

標準Componentは `src/renderer/src/ui/index.ts` から使う。見本と用途のメタデータは `component-registry.ts`、Motionの意味・値・Surface Safety・Reduced Motion Contractは [ui-motion.md](ui-motion.md) を正本とする。既存画面を一括置換せず、新しいUIで標準を先に確認する。

| Component | 主な用途 | Variant / Surface | Core Motion | 避ける場面 |
|---|---|---|---|---|
| Accordion | 補足情報の開閉 | 閉 / 開 / disabled、Standard | AccordionReveal / DisclosureCaret | 必須操作や重要状態を閉じて隠す |
| Toggle | 即時反映の二値設定 | オン / オフ / disabled、Standard | ToggleThumbSlide | 確定操作や三値以上の選択 |
| Panel | 内容のまとまり | Standard / Media Safe / Opaque Media、静止 / enter | PanelEnterSubtle / PanelFadeInMediaSafe（enter時） | 画像・動画入り面へのStandard登場Motion |
| Card | 情報表示または単一操作 | Static / Interactive / disabled、Standard / Media Safe | CardLiftSubtle（Standard Interactiveのみ） | 複数操作の内包、画像入りCardへのlift |

`Panel` は `surface` を必須にする。画像入りには `media-safe` を指定し、動画・WebContentsView等には `opaque-media` を指定する。Opaque Mediaはv1ではMotionなし。`Card` は静的ならdiv、interactiveならbuttonで、画像入りの `media-safe` はliftしない。Motionを使う必要がない `Panel` は静止が既定。

```tsx
import { Accordion, Toggle, Panel, Card } from './ui'

<Accordion title="詳細">補足情報</Accordion>
<Toggle label="通知" description="すぐに反映" checked={enabled} onCheckedChange={setEnabled} />
<Panel surface="media-safe" motion="enter">画像と説明</Panel>
<Card interactive onClick={openDetails}>詳細を開く</Card>
```

Accordionは閉じてもDOMを保持し、閉じた内容はinertにする。buttonのEnter / Space、`aria-expanded`、`aria-controls`、regionで開閉を伝える。Toggleはnative buttonのswitch roleと`aria-checked`で状態を伝える。Reduced Motionでは位置移動を止めても、日本語の状態表示とARIAを残す。両ComponentとCardはキーボードのfocus-visibleを表示する。

開発中の雛形では `npm run dev` →「デザインシステム」→「標準Componentの見本帳を開く」。単独では `npm run gallery` → `http://127.0.0.1:5174/component-gallery.html`。Galleryは実物、状態、通常 / Reduced、Surface、用途、避ける場面、最小コードを確認する内部ツール。生成アプリにはComponent・Motion・styleとこの文書を含め、Gallery UIと開発画面の入口は含めない。
