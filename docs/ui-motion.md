# Motion System v1

Motionを選ぶ基準は、動かす要素の中に画像・動画・特殊な合成面があるかどうか。名前から選び、同じ目的の新規Motionを増やす前にGalleryで比較する。
UIの基礎値とComponentの用途は [ui-foundations.md](ui-foundations.md) → [ui-components.md](ui-components.md) を参照する。本書はMotionとInteractionの契約を扱う。

## Motion Standard Policy

Proofline Works製アプリとapp-kit派生アプリでは、Motionが情報の理解や操作の確認に不要なら動かさない。必要な場合はまずregistryのCoreで表現できるか調べ、できるなら既存Coreを再利用する。足りないものは用途・Surface・Reduced時の状態表示を定め、LabとしてGalleryで比較・評価する。Coreへの昇格はその結果を確認してから行う。各製品で似た独自Motionを先に増やさない。

VideoDeckはProofline標準Motionの**主要な実地検証ソース**である。ただし採用対象は、現行VideoDeckで実際に使われ手触りが確認され、汎用UIとして意味があり、Media Safe・Reduced Motionの条件を満たし、特定layoutやWebContentsViewのlifecycleに強く依存しないものに限る。VideoDeck固有の演出はRecipeまたはLabに留める。流れは **VideoDeck等の実アプリ → Harvest → Lab → Galleryで比較・評価 → Core昇格 → app-kit標準 → 派生アプリで再利用** とする。実アプリでの良さだけを根拠にCoreへ直行させない。

## 4層と昇格

- **Token**: `tokens.css`の意味名。数値の直書きではなく`--ak-motion-duration-standard`等を参照する。
- **Preset**: `presets.css`のCSSクラス。JSで開始・終了を制御しないもの。
- **Behavior**: ReactやJSで再生時点を決めるもの。`ImageFirstPaint`は同じ画像の状態更新では再生しない。
- **Recipe**: 動画・WebContentsView等の描画条件や製品固有のlifecycleを要するもの。Coreにはコピーしない。

registryの`status`は実装段階を表し、Recipeは参照用。CoreにないMotionを使う場合は、製品側で理由と描画面を確認する。MenuPopIn / MenuPopOutは画像を含まない小型文字メニュー向けのLab候補で、既存UIには適用していない。退場時はanimationendと220msのfallbackでDOMから取り除く。

## Surface Safety

| Surface | 判断と許可する動き |
|---|---|
| Standard UI | テキスト中心。軽いtranslate、scale、opacityを使える。 |
| Media Safe | 画像入り。opacity中心。画像そのもののscale・translateを避ける。 |
| Opaque Media Surface | 動画やWebContentsView等。opacityを避け、不透明なまま画面外から移す方式を製品ごとに検討する。 |

親パネルにtransformをかけると、中の画像や合成面にも影響する。「transformが使えるか」だけでなく、実際に含む画像・動画・特殊な合成面で選ぶ。Media Safeでは画像本体の再サンプリングやちらつきを避ける。Opaque Media Surfaceでは不透明性とlifecycleを製品側で検証する。

## Reduced Motion

OSの`prefers-reduced-motion: reduce`を標準契約とする。translate・scale・無限反復を止め、状態は即時または短いopacityで示す。smooth scrollはauto。GalleryのNormal/Reducedは各プレビューに`data-ak-motion`を付けて比較する。Reducedでも、開閉には`aria-expanded`と文字、スイッチには`aria-checked`と文字、ロード中にはラベルを残す。動きを消しても状態情報を失わせない。

## 標準Componentとの対応

Accordion・Switch型Toggle・Panel・Cardは `docs/ui-components.md` の標準Componentとして実装済み。画面に出すだけでMotionを強制せず、Surfaceと必要性を先に確認する。

| Component / 用途 | Core候補 | 現在の扱い |
|---|---|---|
| Accordion | AccordionReveal + DisclosureCaret | 開閉時に使用。DOMを保持し、展開状態を文字・ARIAでも示す。 |
| Switch型Toggle | ToggleThumbSlide | 切替時に使用。現行設定ボタンはこの形へ一括置換しない。 |
| 画像入りPanel | PanelFadeInMediaSafe | `motion="enter"` 時のみ使用。画像本体を動かさない。 |
| テキスト中心Panel | PanelEnterSubtle | `motion="enter"` 時のみ使用。 |
| 操作可能なテキスト中心Card | CardLiftSubtle | Standardかつinteractive時のみ使用。画像入りや静的Cardには適用しない。 |
| Toast | ToastEnterCompact / ToastRiseIn等 | 現行Toastは既存値を維持。Galleryの比較結果をOWNERが評価するまで統一しない。 |
| Dialog / TitleBar / VersionBadge | 対応Coreなし | 現行動作を維持。Dialog ExitはLab。 |

## 使い方

rendererの`main.tsx`がtokensとpresetsを読み込む。必要な箇所に`ak-motion-*`クラスを指定する。画像の初回表示は`ImageFirstPaint`をimportする。registryのコード例・用途・避ける場面を確認する。

雛形app-kitを`npm run dev`で開いたら、画面の「デザインシステム」→「動きの見本帳（Motion Gallery）を開く」から既存Galleryを別窓で開ける。単独閲覧には引き続き`npm run gallery`と`http://127.0.0.1:5174/gallery.html`を使える。「両方再生」で通常/動きを抑える比較を同時にやり直せる。日本語名と正式IDはregistryのメタデータから表示し、詳細の「IDをコピー」で指示用の正式IDを取得できる。生成アプリではGallery UIを除外し、Motion本体と本書を引き継ぐ。入口も雛形の開発画面でのみ表示する。

Toastの既存表示とDialogの即時closeはv1で変更しない。ToastのVideoDeck版は比較用。Dialog Exitはclosing stateからanimation終了後にnative closeするBehaviorとしてLabに置く。

v1未収録: SidebarWidthToggle、ConfirmBounceはLab候補。MediaFullscreenCurtain、ToastSlideOpaque、MediaContentVeilReveal、OverflowMarquee、PlayerControlsAutoHideはRecipe。StatusPulse/Breatheは見送り。ScrollToSectionはBehavior Policy。List StaggerはVideoDeckでHarvest済みではなく、新規Lab候補。
