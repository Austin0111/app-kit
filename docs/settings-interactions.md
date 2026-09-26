# Settings Interaction Consolidation v1

この文書はapp-kit製品画面の設定・設定相当UIの棚卸しと移行判断を記録する。ComponentのAPIは[ui-components.md](ui-components.md)、Foundation値は[ui-foundations.md](ui-foundations.md)、Review手順は[ui-design-review.md](ui-design-review.md)を正本とする。

| 操作 | 意味・保存タイミング | 判定 |
|---|---|---|
| テーマ | ダーク/ライトから単一選択、変更時に即時保存 | native select。Toggleにすると二択の選択という意味が曖昧になる |
| アクセント色 | 色の入力、変更時に即時保存 | ラベル付きnative color input。TextFieldではない |
| ステータスバー表示 | 明確な二値、変更時に即時反映・保存 | 標準Toggleへ移行。`role="switch"`と`aria-checked`で状態を伝える |
| ウィンドウ位置・サイズ | 自動記憶、読取専用の説明 | 手動controlを作らない |
| APIキー | promptで入力・保存、現在値は非表示 | 専用Dialog lifecycleを維持。確認中/取得失敗/保存済みを区別し、状態表示は`role="status"`、設定/消去は標準Button |
| notes | テキスト入力と追加/編集/削除 | TextFieldとButton/EmptyStateを既に利用。編集は専用Dialogを維持 |
| 手動バックアップ・診断・フォルダを開く | 即時のcommand/action | 標準Button。選択状態を持たせない |
| 復元・APIキー消去・notes削除 | 破壊的操作 | 消去はdanger Button。復元は確認Dialog付きの専用手順を維持 |
| バックアップ一覧 | loading/empty/items/errorの情報表示 | 既存EmptyStateと状態表示を維持 |
| Design System入口 | 開発画面へのnavigation | リンクを維持。Buttonへ置換しない |

現行製品画面に、保存ボタンを要する二値設定、複数選択、Checkbox、一般的なSelectの重複、Accordionで開閉すべき補足情報はない。テーマは単一のnative selectで足り、標準Selectのv1を作る根拠はない。Panel/Cardを通常のsectionや複数操作の一覧行へ機械的に適用しない。

設定の読込が終わるまでcontrolを無効化し、失敗時は`role="alert"`と再読込操作を示す。変更は既存の楽観更新とSQLite保存を維持し、保存失敗時は永続状態を再取得してエラーを表示する。ラベル、説明、focus-visible、disabled、読み上げる状態を操作の意味に合わせる。色入力には色名のTextFieldを重ねず、native color inputを保つ。新しいMotionとFoundation tokenは追加しない。

今後、複数の画面で同じ選択・複数選択・フィールド配置が実際に重複した時点でSelect / Checkbox / Field layoutの標準化を再評価する。

## Design Review

Electron製品画面の通常幅1000pxと狭い幅640pxを撮影し、localhostの画像ページから既存Figma Review FileへCaptureした。Figma上で両幅の階層、余白、文字の折返し、controlの揃いと既存Componentの見た目を確認し、今回の範囲で追加修正が必要な崩れは見つからなかった。このCaptureは実画面の**画像**であり、編集可能なUIレイヤーではない。キーボード、ARIA、永続化、Reduced MotionはElectronの実操作テストで別に確認した。
