# Proofline UI Component System v1

標準Componentは `src/renderer/src/ui/index.ts` から使う。用途とAPIは本書、基礎値は [ui-foundations.md](ui-foundations.md)、Motionの意味・値・Surface Safety・Reduced Motion Contractは [ui-motion.md](ui-motion.md) を正本とする。既存画面を一括置換せず、新しいUIで標準を先に確認する。

| Component | 主な用途 | Variant / Surface | Core Motion | 避ける場面 |
|---|---|---|---|---|
| Accordion | 補足情報の開閉 | 閉 / 開 / disabled、Standard | AccordionReveal / DisclosureCaret | 必須操作や重要状態を閉じて隠す |
| Toggle | 即時反映の二値設定 | オン / オフ / disabled、Standard | ToggleThumbSlide | 確定操作や三値以上の選択 |
| Panel | 内容のまとまり | Standard / Media Safe / Opaque Media、静止 / enter | PanelEnterSubtle / PanelFadeInMediaSafe（enter時） | 画像・動画入り面へのStandard登場Motion |
| Card | 情報表示または単一操作 | Static / Interactive / disabled、Standard / Media Safe | CardLiftSubtle（Standard Interactiveのみ） | 複数操作の内包、画像入りCardへのlift |
| Button / IconButton | 汎用操作 | primary / secondary / ghost / danger、standard / compact | fast tokenによる色の反応 | Toggle、画面遷移、タイトルバー等の専用操作 |
| TextField | 単一行の一般的なテキスト入力 | standard、required / disabled / readonly / invalid | なし | 検索・数値・パスワード・複数行・選択肢 |
| EmptyState | 読み込み済み一覧の空状態 | 空 / 内容あり、Standard | なし | 読み込み中・失敗状態、単なる余白埋め |

`Panel` は `surface` を必須にする。画像入りには `media-safe` を指定し、動画・WebContentsView等には `opaque-media` を指定する。Opaque Mediaはv1ではMotionなし。`Card` は静的ならdiv、interactiveならbuttonで、画像入りの `media-safe` はliftしない。Motionを使う必要がない `Panel` は静止が既定。

## TextField v1

`TextField` は単一行の通常テキストを入力するための標準Component。`label` は必須で、`description` と `error` は任意。`required`、`disabled`、`readOnly`、`placeholder`、`name`、`autoComplete`、`value` / `defaultValue`、`onChange` 等はnative input属性を受け取る。呼び出し側のrefもinputへ渡る。既存利用に高さ違いの要請がないため、v1にsize variantは設けない。

```tsx
import { TextField } from './ui'

<TextField label="保存先" description="生成したファイルの保存先です" error={error} required />
<TextField label="メモ" value={draft} onChange={(event) => setDraft(event.target.value)} />
```

labelは`htmlFor`でinputへ結び、description、error、呼び出し側の`aria-describedby`を同じinputへ結ぶ。errorがあれば`aria-invalid="true"`とエラー文を表示する。`required`、`disabled`、`readOnly`はnative semanticsを維持する。ID省略時はReactの`useId`を用い、StrictModeでも再描画時に安定させる。placeholderは補助例でありlabelの代わりにはしない。focus-visibleは明確な輪郭、errorは色に加えて文言で伝える。動きは付けないためReduced Motionでも状態情報は同じ。

短い設定名や自由入力に推奨する。検索・数値・パスワード・複数行・選択肢は、それぞれSearchField / NumberField / PasswordField / TextArea / Selectの別候補とし、`TextField`の`type`を変えて流用しない。prefix / suffix / iconやvalidation frameworkもv1には含めない。

<!-- APP_KIT_ONLY_START -->
棚卸しでは、製品UIのテキスト入力は`App.tsx`のnotes入力と`dialog.tsx`のprompt入力の2箇所。色選択inputは別用途。search / number / password / selectの実画面利用はなく、Motion Galleryのtextareaはコピー用の一時DOMだけである。入力の見た目は`index.css`のglobal `input`とDialog局所CSSに分散していた。notes入力は標準TextFieldを適用し、label・説明文・focus-visibleとEnterでの追加を実画面で確認した。Dialog promptはfocusと送信lifecycleを保つ必要があるため、専用UIとして別途評価する。既存画面は一括置換しない。

<!-- APP_KIT_ONLY_END -->

## EmptyState v1

`EmptyState`は、**読み込みが終わり、実際に項目数が0**の一覧へ使う。`title`と`description`を必須にし、空である事実と次の操作を文字で示す。`div`の`role="status"`で、項目の有無が変わったときに状態を伝える。内容があるときは通常の一覧を表示する。loadingや取得失敗を空と混同しない。装飾・アイコン・action variant・Motionはv1に含めない。

```tsx
import { EmptyState } from './ui'

{loaded && (items.length === 0
  ? <EmptyState title="まだ項目がありません" description="上の操作から追加できます。" />
  : <ItemList items={items} />)}
```

<!-- APP_KIT_ONLY_START -->
製品UIではnotesとバックアップの2つの一覧が空になり得る。従来は見出しの件数以外に説明がなく、空の`ul`だけを表示していた。notesは取得完了後のみEmptyStateを表示し、項目作成後は一覧へ切り替える。バックアップは起動時の自動作成が終わってから初回一覧を返し、`loading / loaded + empty / loaded + items`とerrorを区別する。本当に空と確認できた場合だけEmptyStateを表示する。読み込み失敗は警告文で伝え、既存のバックアップ作成・復元操作を維持する。

### 次Componentの棚卸しと選定

| 候補 | 実利用・重複 | Accessibilityと再利用価値 | 判断 |
|---|---|---|---|
| EmptyState | 製品画面のnotesとバックアップ、計2つの空になり得る一覧。案内なしの空`ul`が重複。バックアップは既定で自動作成 | 空と読み込み中を区別し、次の操作を文字で示せる。notesで実戦投入 | **今回標準化** |
| Status / Badge | 製品画面には版・更新通知、APIキー状態、statusbarがある | 表示位置と操作・更新契約が異なり、単一APIへ寄せると特殊動作を抱え込む | 現行専用UIを維持 |
| Toolbar / IconButton Group | タイトルバー操作とバックアップ操作列がある | TitleBarはOSのdrag領域契約があり、通常操作には既存Buttonが使える | 汎用化を見送る |
| Field / Form layout | notesの一般入力とDialogのpromptがある | Dialogには固有のfocus・submit lifecycleがある。汎用フォームの重複は未確認 | 需要を観測 |
| SearchField / Select / Checkbox / Tabs | 製品UIで該当する操作は未使用。Segmented ControlはMotion Galleryの実験例 | 実利用に基づくAPI・状態契約をまだ決められない | 先行実装しない |

### 既存製品UIへの適用棚卸し

| 判定 | 既存UIと対応Component | 判断・今回の扱い |
|---|---|---|
| A: そのまま寄せられる | notesの追加→Button、notesの削除記号→IconButton、手動バックアップ→Button | 低リスクの3箇所だけ適用。削除記号には項目名を含む`aria-label`を付けた |
| A: 適用済み | notes入力→TextField、notesと読み込み済みで空のバックアップ一覧→EmptyState | 入力・空状態の契約を実画面で使う。バックアップは自動作成を待ってから空を判定 |
| B: 専用挙動 | TitleBarの窓操作、VersionBadge、Dialogのprompt/確定、Toast | drag領域、focus/submit、通知のlifecycleを保持。形だけを標準に寄せない |
| C: 見た目は似るが意味が異なる | 設定KVの状態表示ボタン、複数操作を持つnotes/バックアップの行、Design Systemへのリンク | Toggleへの変更は状態の読み上げと配置を含む判断が必要。行は単一操作Cardではなく、リンクはButtonではない |
| D: 現状維持 | 開閉する補足情報がない画面、通常のsection、色入力、復元・診断・フォルダ操作、ErrorBoundaryの復旧操作 | Accordion/Disclosure・Panel・Cardの適用先を作るためにUIを変えない。色入力はTextFieldではない。残りの操作は確認を伴うため一括移行しない |

Motionは上記dogfoodで新規追加しない。標準Button/IconButtonの既存feedbackのみを使い、EmptyStateは静止した状態表示とする。

<!-- APP_KIT_ONLY_END -->

## Button v1

`Button` は標準で `secondary` / `standard` / `type="button"`。画面の主操作は `primary`、補助操作は `secondary`、背景を持たない軽い操作は `ghost`、削除など破壊的な操作は `danger`。狭いツール領域には `compact`。アイコンと文字の組み合わせは `icon` を渡す。アイコンだけなら `IconButton` を使い、`aria-label` を必ず指定する。両方とも native button の属性（`disabled`、`aria-pressed`、`type` 等）を受け取る。ロード状態は現行実装に需要がなく、v1には含めない。

```tsx
import { Button, IconButton } from './ui'

<Button variant="primary" onClick={save}>保存</Button>
<Button size="compact" icon={<PlusIcon />}>追加</Button>
<IconButton aria-label="閉じる" onClick={close}><CloseIcon /></IconButton>
```

ボタン操作は native の Enter / Space と `disabled` を使う。focus-visible は共通の輪郭で表示する。選択を保持する用途は適切な `aria-pressed` と文字を併用するが、即時反映の二値設定は `Toggle` を使う。リンクへの遷移は `a` を使う。押下時は枠色が即時に反応し、hoverの色変化は既存 `--ak-motion-duration-fast` / `--ak-motion-ease-standard` を参照する。Reduced Motionでは duration token が 1ms となり、位置移動はない。PressSoft / PressCompactは現行registryに存在しないため、未承認のCore Motionとして追加しない。

<!-- APP_KIT_ONLY_START -->
### 棚卸しと移行

- **標準化して残す**: `Accordion` の開閉、`Toggle` のswitch、`Card` の面全体操作。これらは独自の意味とARIA状態を持つ。TitleBar、VersionBadge、Toastのdismiss、Dialogの確定/危険操作も専用の配置・挙動があるため現行実装を維持する。
- **標準Buttonへ寄せられる**: `App.tsx` の追加・バックアップ・診断等の汎用操作、Galleryの再生・補足操作、ErrorBoundaryの復旧操作。v1ではGalleryの2箇所だけ適用した。Galleryの選択ナビゲーションは選択状態と配置があるため別途判断する。
- **特殊用途**: テーマ・ステータスバーの即時設定ボタンは `aria-pressed` や `Toggle` への移行を含めて検討する。Dialog・VersionBadge・TitleBarは専用スタイルを保持し、一括置換しない。`App.tsx` の「×」は accessible name の追加が先決。画面遷移は既存のリンクを維持する。

既存の `<button>` はほぼ native 要素で、`div role="button"` 等の代用は見つからなかった。汎用ボタンの背景色・余白は `index.css` の全体指定と `li button`、Dialog、Galleryの局所CSSに分散している。focus-visible は一部専用ComponentとGalleryにはあるが、通常の `App.tsx` ボタンには共通指定がない。hover / active feedbackも用途ごとにばらつく。新規の汎用操作から標準Buttonを使い、既存画面は振る舞いと見た目を比較して段階的に移行する。

<!-- APP_KIT_ONLY_END -->

```tsx
import { Accordion, Toggle, Panel, Card } from './ui'

<Accordion title="詳細">補足情報</Accordion>
<Toggle label="通知" description="すぐに反映" checked={enabled} onCheckedChange={setEnabled} />
<Panel surface="media-safe" motion="enter">画像と説明</Panel>
<Card interactive onClick={openDetails}>詳細を開く</Card>
```

Accordionは閉じてもDOMを保持し、閉じた内容はinertにする。buttonのEnter / Space、`aria-expanded`、`aria-controls`、regionで開閉を伝える。Toggleはnative buttonのswitch roleと`aria-checked`で状態を伝える。Reduced Motionでは位置移動を止めても、日本語の状態表示とARIAを残す。両ComponentとCardはキーボードのfocus-visibleを表示する。

<!-- APP_KIT_ONLY_START -->
開発中の雛形では `npm run dev` →「デザインシステム」→「標準Componentの見本帳を開く」。単独では `npm run gallery` → `http://127.0.0.1:5174/component-gallery.html`。Galleryは実物、状態、通常 / Reduced、Surface、用途、避ける場面、最小コードを確認する内部ツール。生成アプリにはComponent・Motion・styleとこの文書を含め、Gallery UIと開発画面の入口は含めない。
<!-- APP_KIT_ONLY_END -->
