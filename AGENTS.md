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

- 依存導入は README の順序どおり `npm install --ignore-scripts`、`node node_modules/electron/install.js`、`npx electron-rebuild -w better-sqlite3` を使う。
- 雛形からアプリを作る前に `scripts/create-app.mjs` と README 末尾の注意事項を確認する。
- テストは `tests/helpers.ts` を通して一時 userData を使い、本番データへ干渉させない。
