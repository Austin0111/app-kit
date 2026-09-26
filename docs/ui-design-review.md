# UI Design Review / Figma Capture Workflow v1

この文書は `AGENTS.md` のUI開発フローにおけるReview File、実画面Capture、Review方法を定める。Componentの用途は [ui-components.md](ui-components.md)、Motionの分類・安全性・値・昇格条件は [ui-motion.md](ui-motion.md) を正本とし、ここでは重複定義しない。

<!-- APP_KIT_REVIEW_FILE_START -->
## app-kit専用Review File

- 名前: **Proofline App Kit - Design Review**
- URL: https://www.figma.com/design/AAJ0mwevHzAmjBHv9W20ok/Proofline-App-Kit---Design-Review
- fileKey: `AAJ0mwevHzAmjBHv9W20ok`
- 実地Capture: [Component Gallery（2026-09-27）](https://www.figma.com/design/AAJ0mwevHzAmjBHv9W20ok/Proofline-App-Kit---Design-Review?node-id=8-2)、[Foundation Gallery（2026-09-27）](https://www.figma.com/design/AAJ0mwevHzAmjBHv9W20ok/Proofline-App-Kit---Design-Review?node-id=10-2)、[設定UIのElectron実画面画像（2026-09-27）](https://www.figma.com/design/AAJ0mwevHzAmjBHv9W20ok/Proofline-App-Kit---Design-Review?node-id=12-2)

新しいUI変更ごとにFileを作り直さず、このFileへCaptureを追加する。URLとfileKeyは通常の参照情報であり、認証情報は保存しない。派生アプリは製品固有のReview Fileを使う。
<!-- APP_KIT_REVIEW_FILE_END -->

## 発動条件と位置付け

新規画面、大規模なレイアウト変更、新規Reusable Component、大幅なVisual Redesignをsubstantial UI workとする。Figmaは実装前の必須制作工程ではなく、実装後のQuality Gateである。文言修正、軽微なstyle調整、見た目が変わらないrefactorにはFigma Reviewを要求しない。

## 標準Capture Workflow

1. UIを実装し、通常・Reduced Motionと対象画面幅で操作を確認する。
2. 対象画面をブラウザーで表示できる開発用localhostで起動し、実際に表示されたURLと状態を確認する。
<!-- APP_KIT_ONLY_START -->
   app-kitの接続確認には `npm run gallery` → `http://127.0.0.1:5174/component-gallery.html` を使える。
<!-- APP_KIT_ONLY_END -->
3. Figma連携のlocalhost Capture機能で、上記のReview Fileの`fileKey`を指定し、**実際に動く画面**を取り込む。ID発行だけでは送信されない。対象HTMLへ連携が返す`capture.js`のscriptタグを一時的に加え、返されたcaptureId・endpointを含むlocalhost URLをブラウザーで開き、`pending → processing → completed`を確認する。scriptタグは取込み後に外し、captureIdや一時URLをrepoへ保存しない。既存のCaptureを消さず、対象と日時が分かる名前を付ける。連携によるCaptureが使えなくてもFigmaへアクセスできる場合は、localhostの実画面を画像として貼り、画像Captureであることを明記して視覚Reviewを行える。
4. Figma上でCapture結果を見て、下記の観点を既存Design Systemと照合する。画像だけでは操作・ARIA・Reduced Motionを判定できないため、実画面の操作確認も併用する。
5. 指摘のうち今回の範囲に入るものをコードへ反映し、画面・テスト・必要なら再Captureで確認する。判断が必要な新規Pattern / MotionはDesign Harvest / Lab候補に留める。

ElectronのpreloadやIPCに依存する画面がブラウザーのlocalhostで正常に表示できない場合、同じrendererのブラウザーで動く開発用Previewを使う。実画面を手作業で描き直してCaptureの代わりにしない。

## Reviewで確認すること

- Visual hierarchy: 主操作、補助情報、状態表示の優先順位が分かるか。
- Spacing / alignment / density: 余白と揃え方が一貫し、狭い画面でも読めるか。
- Typography / readability: 日本語の長い文言、サイズ、コントラスト、行間が適切か。
- Accessibility: キーボード操作、フォーカス、ARIA、Reduced Motion時の状態表示が保たれるか。
- Consistency / component reuse: 既存ComponentやPatternで表現できる箇所を重複実装していないか。
- Motion appropriateness: Motionが必要か、Coreを再利用しているか、Surface SafetyとReduced Motion Contractを守るか。
- Proofline Design Systemとの整合: 既存の色、文字、Component、Motionとの違いに理由があるか。

実装画面と既存Design Systemの根拠を照合し、指摘は対象箇所・理由・変更方針を残す。Reviewで直した内容は、通常のUIテストとスクリーンショット目視でも確かめる。未確定のMotion値はReviewだけで標準化せず、OWNER評価まで比較状態を維持する。

<!-- APP_KIT_ONLY_START -->
2026-09-27の実地試験では、以前のCapture IDは`pending`のままだったが、一時scriptを読み込ませた新しい2件は完了した。Figma上の通常幅とlocalhostの通常・狭い幅を照合し、Foundation Galleryに階層・文字切れ・重なりの問題は見つからなかった。製品画面の通常Reviewでは、手動バックアップの標準Buttonを既存操作列と同じprimaryに修正し、lightテーマの警告文のコントラストを既存色のmixで改善した。Figma Captureは静止状態の視覚確認であり、キーボード・ARIA・Reduced Motionは実画面テストで確認する。
<!-- APP_KIT_ONLY_END -->

## Figmaを利用できない場合

Figma接続、localhost Capture、対象画面のブラウザー表示ができない場合は作業を止めず、実画面のスクリーンショットと既存UI / Design Systemを使って同じ観点の通常Reviewを行う。Figma上の画像Captureは視覚Reviewには使えるが、編集可能なレイヤーや動作検証の代わりにはならない。完了報告には連携Capture・画像Capture・Figma Review・通常Reviewの実施状況と理由を分けて記す。レビューで有用な新規PatternやMotionはHarvest / Lab候補として扱い、Coreへの昇格はGallery評価後に判断する。
