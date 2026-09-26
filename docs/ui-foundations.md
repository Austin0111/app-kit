# Proofline UI Foundations v1

Foundationは、既存画面で繰り返し使われる基礎値の名前を定める。正本は `src/renderer/src/foundation/tokens.css`。**Base → Foundation → Layout + Components → Motion / Interaction → Product UI** の責務は [ui-layout.md](ui-layout.md) にまとめる。Componentの用途は [ui-components.md](ui-components.md)、動きとSurface Safetyは [ui-motion.md](ui-motion.md)、Review方法は [ui-design-review.md](ui-design-review.md) を参照する。

## 今回標準化した値

| 日本語名 | 正式Token名 | 実値 | 用途・既存の根拠 |
|---|---|---|---|
| 関連操作の間隔 | `--ak-foundation-space-related` | `8px` | 製品画面とDialogの`.ak-layout-inline`、Galleryの操作列で使われる短い間隔 |
| 操作部品の角丸 | `--ak-foundation-radius-control` | `6px` | native button/input、標準Button/TextFieldに繰り返される角丸 |
| 情報面の角丸 | `--ak-foundation-radius-surface` | `8px` | Accordion/Panel/Card/EmptyState、Toast、Galleryの比較面 |
| フォーカス輪郭の太さ | `--ak-foundation-focus-width` | `2px` | 標準Componentと両Galleryの`:focus-visible` |
| フォーカス輪郭の距離 | `--ak-foundation-focus-offset` | `2px` | 通常の操作部品の`:focus-visible`。Accordion内側の負値などは専用値を維持 |
| 警告の文字色 | `--ak-foundation-color-warning` | dark: `#f0a020`、light: 既存警告色と`--fg`の50% mix | 製品画面の警告文と描画失敗見出し。明るい面では文字のコントラストを確保 |
| 補助文の文字サイズ | `--ak-foundation-type-supporting` | `13px` | 製品画面の説明文・警告文・Toast等に繰り返される文字サイズ |

既存の`--bg`、`--fg`、`--muted`、`--line`、`--accent`は製品画面とGalleryのテーマ文脈を担う。今回これらを別名で複製しない。色の直書きには用途ごとに異なる値もある。dangerの背景とToastのerror境界、複数のshadowは見た目・役割が一致しないため統一しない。新しいcolor/spacing scaleや未使用のsuccess/info tokenは作らない。
lightテーマの元の警告色は背景`#f7f7f8`とのコントラスト比が約2.01:1だった。既存の警告色と前景色から作る50% mixは約5.47:1となるため、警告の意味を残したまま文字を読めるようにした。

```css
.actions { gap: var(--ak-foundation-space-related); }
.control { border-radius: var(--ak-foundation-radius-control); }
.control:focus-visible {
  outline: var(--ak-foundation-focus-width) solid var(--accent);
  outline-offset: var(--ak-foundation-focus-offset);
}
```

新規UIでは既存tokenが用途に合えば直書きより優先する。異なる意味の値を見た目だけで寄せず、実利用と比較・Reviewが揃うまでtokenを増やさない。Token本体は派生アプリへ含め、開発用Galleryは含めない。

<!-- APP_KIT_ONLY_START -->
開発時は `npm run gallery` → `http://127.0.0.1:5174/foundation-gallery.html`、または開発画面の「デザインシステム」→「標準Foundationの見本帳を開く」で確認する。各項目に日本語名、正式Token名、CSSから読んだ実値、用途、使用例を表示する。
<!-- APP_KIT_ONLY_END -->
