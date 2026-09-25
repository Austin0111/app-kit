# UI Design Review / Figma Integration v1

この文書は `AGENTS.md` のUI開発フローにおけるReview方法を定める。Motionの分類・安全性・値・昇格条件は [ui-motion.md](ui-motion.md) を参照し、ここでは重複定義しない。

## 発動条件と位置付け

新規画面、大規模なレイアウト変更、新規Reusable Component、大幅なVisual Redesignをsubstantial UI workとする。実装後にFigma plugin / integrationが利用可能ならDesign Reviewを行い、指摘をコードへ反映して再確認する。Figmaは実装前の必須制作工程ではない。文言修正、軽微なstyle調整、見た目が変わらないrefactorにはFigma Reviewを要求しない。

## Reviewで確認すること

- Visual hierarchy: 主操作、補助情報、状態表示の優先順位が分かるか。
- Spacing / alignment / density: 余白と揃え方が一貫し、狭い画面でも読めるか。
- Typography / readability: 日本語の長い文言、サイズ、コントラスト、行間が適切か。
- Accessibility: キーボード操作、フォーカス、ARIA、Reduced Motion時の状態表示が保たれるか。
- Consistency / component reuse: 既存ComponentやPatternで表現できる箇所を重複実装していないか。
- Motion appropriateness: Motionが必要か、Coreを再利用しているか、Surface SafetyとReduced Motion Contractを守るか。
- Proofline Design Systemとの整合: 既存の色、文字、Component、Motionとの違いに理由があるか。

実装画面と既存Design Systemの根拠を照合し、指摘は対象箇所・理由・変更方針を残す。Reviewで直した内容は、通常のUIテストとスクリーンショット目視でも確かめる。未確定のMotion値はReviewだけで標準化せず、OWNER評価まで比較状態を維持する。

## Figmaを利用できない場合

作業を止めず、実装画面のスクリーンショットと既存UI / Design Systemを使って同じ観点の通常Reviewを行う。完了報告には「Figma Review未実施」と利用できなかった理由を明記する。レビューで有用な新規PatternやMotionはHarvest / Lab候補として扱い、Coreへの昇格はGallery評価後に判断する。
