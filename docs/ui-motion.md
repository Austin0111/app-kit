# Motion System v1

Motionを選ぶ基準は、動かす要素の中に画像・動画・特殊な合成面があるかどうか。名前から選び、同じ目的の新規Motionを増やす前にGalleryで比較する。

## 4層と昇格

- **Token**: `tokens.css`の意味名。数値の直書きではなく`--ak-motion-duration-standard`等を参照する。
- **Preset**: `presets.css`のCSSクラス。JSで開始・終了を制御しないもの。
- **Behavior**: ReactやJSで再生時点を決めるもの。`ImageFirstPaint`は同じ画像の状態更新では再生しない。
- **Recipe**: 動画・WebContentsView等の描画条件や製品固有のlifecycleを要するもの。Coreにはコピーしない。

VideoDeckの実装をHarvestし、GalleryのLabで実際の動作・reduced時の理解しやすさ・回帰を評価してからCoreへ昇格する。registryの`status`は実装段階を表し、Recipeは参照用。CoreにないMotionを使う場合は、製品側で理由と描画面を確認する。MenuPopIn / MenuPopOutは画像を含まない小型文字メニュー向けのLab候補で、既存UIには適用していない。退場時はanimationendと220msのfallbackでDOMから取り除く。

## Surface Safety

| Surface | 判断と許可する動き |
|---|---|
| Standard UI | テキスト中心。軽いtranslate、scale、opacityを使える。 |
| Media Safe | 画像入り。opacity中心。画像そのもののscale・translateを避ける。 |
| Opaque Media Surface | 動画やWebContentsView等。opacityを避け、不透明なまま画面外から移す方式を製品ごとに検討する。 |

親パネルにtransformをかけると、中の画像や合成面にも影響する。クラス名だけを見ず、実際に含む内容で選ぶ。

## Reduced Motion

OSの`prefers-reduced-motion: reduce`を標準契約とする。空間移動・scale・無限反復を止め、状態は即時または短いopacityで示す。smooth scrollはauto。GalleryのNormal/Reducedは各プレビューに`data-ak-motion`を付けて比較する。Reducedでも、開閉には`aria-expanded`と文字、スイッチには`aria-checked`と文字、ロード中にはラベルを残す。

## 使い方

rendererの`main.tsx`がtokensとpresetsを読み込む。必要な箇所に`ak-motion-*`クラスを指定する。画像の初回表示は`ImageFirstPaint`をimportする。registryのコード例・用途・避ける場面を確認する。

雛形app-kitの開発用Galleryは`npm run gallery`を実行し、`http://127.0.0.1:5174/gallery.html`で開く。「両方再生」で通常/動きを抑える比較を同時にやり直せる。日本語名と正式IDはregistryのメタデータから表示し、詳細の「IDをコピー」で指示用の正式IDを取得できる。生成アプリではこのscriptとGallery UIを除外し、Motion本体と本書を引き継ぐ。

Toastの既存表示とDialogの即時closeはv1で変更しない。ToastのVideoDeck版は比較用。Dialog Exitはclosing stateからanimation終了後にnative closeするBehaviorとしてLabに置く。

v1未収録: SidebarWidthToggle、ConfirmBounceはLab候補。MediaFullscreenCurtain、ToastSlideOpaque、MediaContentVeilReveal、OverflowMarquee、PlayerControlsAutoHideはRecipe。StatusPulse/Breatheは見送り。ScrollToSectionはBehavior Policy。List StaggerはVideoDeckでHarvest済みではなく、新規Lab候補。
