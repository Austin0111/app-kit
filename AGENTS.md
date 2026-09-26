# Codex 作業指示

このリポジトリは Claude Code から Codex へ移行した `app-kit` である。
既存の Claude Code 用設定は互換資料として保持し、削除・置換しない。

## 適用する仕様

- 作業前に、このファイルとルートの `CLAUDE.md` を最後まで読む。
- `CLAUDE.md` の Git 方針、完了条件、テスト方針、スクリーンショット確認、3 回停止ルールを Codex にも適用する。
- `.claude/settings.json` の PostToolUse フックは Codex では自動実行されないため、TypeScript / TSX 編集後は `npm run typecheck` を明示的に実行する。
- ユーザーの既存変更、未追跡ファイル、ローカルデータ、Claude Code 用設定を削除・上書き・stash・reset しない。

## 検証

- 小さな文言・コメント修正: `npm run typecheck` と関係テスト。
- 機能追加・UI 変更: `npm run verify` と `test-results/screenshots/` の目視確認。
- リリース前: 上記に加えて `npm run dist`、配布版の起動と実操作。
- PowerShell では `electron-vite` を直接呼ばず、`npm run build` または定義済み npm script を使う。

## app-kit 固有事項

- 新しいUI Motionは `docs/ui-motion.md` の Motion Standard Policy に従う。不要なら動かさず、必要ならCoreを先に選ぶ。新規候補はLabで比較し、VideoDeck固有のRecipeを無条件に移植しない。
- 新しいUIでは `docs/ui-components.md` の標準Componentを先に確認し、既存の用途・Surfaceに合うものを再利用する。
- 新しい汎用操作ボタンは、`docs/ui-components.md` の標準Button / IconButtonを優先する。
- 新規の一般的な単一行テキスト入力UIでは、`docs/ui-components.md` の標準TextFieldを優先する。
- 読み込み済み一覧の空状態には、`docs/ui-components.md` の標準EmptyStateを確認する。
- 新しいUIで用途の合うFoundation tokenがある場合は `docs/ui-foundations.md` を確認して直書きより優先し、実需要なしにtokenを増やさない。
- LayoutとCSS責務は `docs/ui-layout.md` を正本とする。starter画面の配置を標準Layoutとして扱わず、用途の合う既存Primitiveを優先する。実需要なしに新Primitiveを増やさず、製品固有layoutをglobal selectorへ混ぜない。

- 依存導入は README の順序どおり `npm install --ignore-scripts`、`node node_modules/electron/install.js`、`npx electron-rebuild -w better-sqlite3` を使う。
- 雛形からアプリを作る前に `scripts/create-app.mjs` と README 末尾の注意事項を確認する。
- テストは `tests/helpers.ts` を通して一時 userData を使い、本番データへ干渉させない。
- 変更箇所ごとの追加検証と配布前の判断は `docs/maintenance.md` のChange Impact Matrixを参照する。上記の必須検証を省略する根拠にはしない。

### UI Design Review / Figma Integration

標準UI開発フローを次の順で進める。詳細なReview方法は `docs/ui-design-review.md`、Motionの値・Surface Safety・Reduced Motion Contractは `docs/ui-motion.md` を正本とする。

1. UI変更の規模と種類を判定する。新規画面、大規模なレイアウト変更、新規Reusable Component、大幅なVisual Redesignをsubstantial UI workとする。
2. 既存Component、Design System、Motion Registryを確認する。
3. 既存パターンで表現できる場合は再利用する。OWNER向けUIは日本語を優先し、内部ID・コード識別子は英語でよい。
4. 情報理解や操作確認に不要なMotionを追加しない。
5. Motionが必要ならCoreを優先する。Toast比較など未確定の値はOWNER評価前に統一しない。
6. 内容物を基準にStandard / Media Safe / Opaque MediaのSurfaceを分類し、Reduced Motionでも状態情報を残す。
7. 実装し、通常・Reduced双方と該当する画面幅で確認する。
8. substantial UI workでは、`docs/ui-design-review.md` のReview FileとCapture Workflowを参照し、利用可能なFigma integrationを使って実装後のDesign Reviewを行う。利用できない場合は通常のUI reviewを行い、未実施理由を報告する。小変更には要求しない。
9. Reviewで見つけた問題をコードに反映し、再確認する。
10. 有用な新規Pattern / MotionはLab、Gallery、Design Harvestの候補として記録し、評価前にCoreへ昇格させない。

VideoDeckは標準Motionの主要な実地検証Sourceだが、製品固有の演出を無条件に標準化しない。昇格経路とSurfaceごとの許容Motionは `docs/ui-motion.md` を正本とする。
