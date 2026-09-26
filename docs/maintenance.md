# app-kit Production Baseline / Maintenance v1

この文書は変更時の検証範囲と運用手順の正本。作業規約はルートの `AGENTS.md` / `CLAUDE.md`、UIの仕様は `ui-layout.md`、`ui-foundations.md`、`ui-components.md`、`ui-motion.md`、`ui-design-review.md` を参照する。ここにUI仕様を複製しない。`settings-interactions.md`はapp-kit製品画面の判断記録で、派生アプリには含めない。

## コマンドの入口

| 目的 | コマンド | 確認点 |
|---|---|---|
| 新規派生アプリ | `node scripts/create-app.mjs <id> --display "表示名" --dir <空の検証先>` | 名前、生成AGENTS、開発専用資産の除外。生成先が既存なら停止 |
| 依存導入 | `npm install --ignore-scripts` → `node node_modules/electron/install.js` → `npx electron-rebuild -w better-sqlite3` | Electron本体とnative moduleを明示的に揃える |
| 開発起動 | `npm run dev` | Electron実画面とConsole Errorを確認 |
| 型・名前・build・テスト | `npm run verify` | PlaywrightのPASS/skip数とスクリーンショットを確認 |
| 開発Gallery | `npm run gallery` | app-kit専用。Motion / Component / Foundationの各HTMLを開く |
| 配布物 | `npm run dist` → `npm run test:packaged` | 現行版を再buildし、配布版起動・DB・変更履歴を確認 |
| Installer E2E | `npm run test:installer` | NSIS経路を変更した時や配布前。既存導入がある場合は安全のため中止 |

`npm run test`はPlaywrightだけ、`npm run typecheck`は型だけ、`npm run build`はElectron/Vite buildと名前検査だけ。`npm run test:packaged`は配布物が無ければ失敗する。`npm run verify`中のpackaged testは`dist`が無ければskipし、残っていれば古い配布物を試すことがあるため、**配布確認は必ず`dist`の後に`test:packaged`**を使う。`npm run release:verify`はverify・dist・packaged・installer・スクリーンショット・版整合まで一括実行する強い配布ゲートであり、通常の小変更には使わない。

## Change Impact / Verification Matrix

下表は変更箇所ごとの追加確認を示す。`AGENTS.md` / `CLAUDE.md`の必須検証を弱めない。UI変更なら`npm run verify`と画像目視、TypeScript/TSX編集後は`npm run typecheck`を実行する。

| 変更箇所 | 追加で見るもの |
|---|---|
| 文書・コメントのみ | リンク、コマンド、参照先の実在。必要なら型検査と関係テスト |
| Base / Foundation / Layout CSS | 通常・狭い幅、Componentの実画面、Fresh派生アプリの別Layout、build |
| Component / product UI | Component Gallery、dogfood画面、keyboard・focus・ARIA・disabled、通常/Reduced、スクリーンショット。共通部品変更ならFresh派生アプリ |
| Motion | Motion GalleryのReplayと通常/Reduced、Surface Safety、利用Component、Fresh派生アプリ |
| generator / 生成AGENTS / include・exclude | `tests/generator.spec.ts`、Fresh生成、継承と開発専用資産の非混入、生成先のtypecheck・build・tests・起動 |
| main / preload / DB / native依存 | 関係するIPC・永続化・障害テスト、Fresh生成。配布経路に関わる場合は`dist`と`test:packaged` |
| packaging / installer / build設定 | `npm run verify`、`npm run dist`、`npm run test:packaged`。NSIS設定・インストール先・配布対象を変えた場合は`test:installer` |
| version / release | package・lock・CHANGELOGの版整合、`dist`、`test:packaged`。公開前の正式ゲートは`release:verify` |

## 作業手順

1. `git status`と`AGENTS.md` / `CLAUDE.md`を確認する。ユーザーの未コミット変更を保存・削除しない。
2. 変更対象の正本を読み、上表から必要な検証を選ぶ。UIでは既存Foundation / Layout / Component / Motionを先に探し、substantial UI workなら`ui-design-review.md`に従う。
3. 新規アプリは正式generatorで空の一時先へ作る。生成物を手修正してgeneratorの不具合を隠さず、app-kitを直した後はFresh生成し直す。starterは利用例であり製品UIの強制Layoutではない。
4. 検証結果のPASS/skip、Console Error、画像の見た目を確認する。配布経路を触った時は上表に従って配布版・必要ならinstallerを試す。
5. Proofline Works Version Policyに従い、package・lockのversion、CHANGELOG、ローカルcommitを揃える。pushは明示指示がある場合だけ行う。

## 失敗した時

| 失敗 | 最初に確認する場所 |
|---|---|
| create-app | 標準出力の対象path・必須ファイル/置換/境界の診断、既存生成先、`tests/generator.spec.ts`。不完全な生成先を製品として扱わない |
| install / native rebuild | 3手順の順序、Node/Electron版、`node_modules/electron/install.js`とrebuildの終了コード。秘密情報をログへ貼らない |
| typecheck / build | 最初のエラー位置、`npm run check:names`、`electron.vite.config.ts`、renderer/main/preloadのどのbuildか |
| Playwright / Console | 失敗テストと一時userData、`test-results/`、rendererのConsole。skip理由を確認し、アサーションを弱めない |
| packaged / installer | `dist`の版と実行ファイル、`test:packaged`の必須モード、installerの既存導入ガード。既存導入を消して検証しない |
| Figma Capture | `ui-design-review.md`のscript・captureId・localhost URL・completed状態。失敗時は実画面スクリーンショットで通常Reviewへ移る |

生成・配布に失敗した時は元の標準出力と終了コードを残し、外部環境と実装のどちらが原因か切り分ける。資格情報やAPIキーを診断ログへ追加しない。
