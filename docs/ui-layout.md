# UI Layout Foundations v1

UIの責務は **Base → Foundation → Layout + Components → Motion / Interaction → Product UI** の順に考える。色や間隔の正本は [ui-foundations.md](ui-foundations.md)、Componentは [ui-components.md](ui-components.md)、動きは [ui-motion.md](ui-motion.md) を参照する。

| 層 | 実体 | 責務 |
|---|---|---|
| Base | `src/renderer/src/base.css` | documentの文字・背景・body margin。viewport高、scroll所有、製品配置は定めない |
| Foundation | `src/renderer/src/foundation/tokens.css` | 既存の基礎値。用途に合うtokenを参照する |
| Layout | `src/renderer/src/layout/inline.css` | 隣接する操作の横並びと関連操作の間隔 |
| Components | `src/renderer/src/ui/components.css`、`ui/chrome.css` | 部品自身の外観と操作。画面の構造は定めない |
| Product / starter | `src/renderer/src/starter.css` | 生成直後のサンプル画面の幅、見出し、区切り、一覧、scroll、theme |
| Dev | `src/renderer/src/dev`、各Gallery CSS | app-kit専用。派生アプリへコピーしない |

`starter.css`はサンプル画面を表示するため派生アプリに含まれるが、Design Systemの標準Layoutではない。新製品画面を作る際に、この画面のDOMや配置を継承する必要はない。`main.tsx`でのimportはサンプル画面を動かすためであり、別画面用entryではBase / Foundation / Layout / Component / Motionを選んでimportし、`starter.css`を省ける。

## Inline

`ak-layout-inline`は、設定の隣接操作、ノート行、Dialogの操作ボタンなど、複数箇所の同じ8px間隔を一つにするCSS class。意味・色・背景・padding・折返し・整列は持たない。

```tsx
<div className="ak-layout-inline">
  <Button>保存</Button>
  <Button variant="secondary">キャンセル</Button>
</div>
```

画面固有の折返しや整列は、その画面のclassで指定する。AppShell、Sidebar、Page等は現在のrepoに一般化できる実利用がなく、標準として追加しない。新しい画面は製品固有layoutを局所CSSとして普通に作り、必要な形が複数製品で確認された場合にだけ標準化を検討する。製品固有styleをglobal selectorへ追加せず、Component内部styleの安易な上書きは避ける。
