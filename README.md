# app-kit

新規デスクトップアプリの雛形。
`.dev/開発系メモ/棚卸し/` の棚卸し結果をもとに、**次のアプリが初日から要るもの**だけを詰めてある。

**使い方**: このフォルダごとコピーして名前を変える。既存アプリを触る話ではない。

## スタック

electron-vite / React 18 / TypeScript / better-sqlite3 / Drizzle ORM

## セットアップ

```
npm install --ignore-scripts
node node_modules/electron/install.js
npx electron-rebuild -w better-sqlite3
```

**この 3 手順で入れること。** 素の `npm install` だと better-sqlite3 が
ソースビルドに回り、この環境（VS18 / Node v24）では node-gyp が Visual Studio を
認識できずに失敗する。

```
npm run dev         開発起動
npm run typecheck   型検査
npm run db:generate スキーマ変更後のマイグレーション生成
```

## 入っているもの

| 場所 | 中身 |
|---|---|
| `src/shared/settings.ts` | 設定の型と既定値。**ここ 1 箇所**で定義し main / renderer 双方から参照する |
| `src/main/settings.ts` | 設定KV の永続化。値は JSON 文字列で 1 列に持つ。変更は全ウィンドウへ配信 |
| `src/main/db/` | DB とマイグレーション適用。スキーマは `schema.ts` |
| `src/main/backup.ts` | バックアップ／復元。自動世代管理つき |
| `src/main/crash-log.ts` | 未処理例外を `crash.log` に残す。**何よりも先に仕掛ける** |
| `src/main/window.ts` | 窓制御（最小化 / 最大化 / 閉じる）と最大化状態の push |
| `src/renderer/src/ui/` | カスタムタイトルバー、モーダル（confirm / prompt / 任意ボタン）、トースト |
| `src/main/spawn.ts` | 外部プロセス起動。**どこからも import していない。要らなければ消してよい** |

`notes` テーブルと画面上の一覧は**動作確認用**。新アプリでは消してよい。

## マイグレーション

`src/main/db/schema.ts` を編集して `npm run db:generate` を叩くと、
`drizzle/` に差分 SQL が生成される。適用は起動時に自動。

**`drizzle/` は commit する**（適用履歴そのもの）。`.gitignore` に入れてはいけない。

## 覚えておくこと

- **バックアップに素朴なファイルコピーを使わない**。WAL モードでは動作中の内容が
  `.db-wal` 側にあり、本体だけコピーすると中身が抜ける。`db.backup()` を使う
- **起動中の DB ファイルは掴まれていて上書きできない**。だから復元は
  `.restore` に待避して次回起動時に適用する
- **`setState` の更新関数に副作用を書かない**（`setTimeout` / id 採番 / `resolve`）。
  StrictMode は更新関数を 2 回呼ぶ
- **React 18 は `<dialog>` の `cancel` / `close` を合成イベント化していない**（React 19 から）。
  `onCancel` では Esc が拾えないので ref 経由でネイティブに張る
- **子プロセスの出力は UTF-8 とは限らない**。Windows の既定コードページは CP932。
  詳細と対処は `src/main/spawn.ts` の冒頭コメント
- **タイトルバーに操作要素を足したら `-webkit-app-region: no-drag` を当てる**。
  忘れるとクリックがドラッグ領域に飲まれて反応しなくなる
- **最大化状態は main から push で受け取る**。最大化はボタン以外でも起きる
  （画面端スナップ・バーのダブルクリック・Win+↑）ので、ボタン押下時だけ更新すると
  アイコンが実際とズレる

### 標準のタイトルバーに戻したい場合

`src/main/index.ts` の `frame: false` / `titleBarStyle` / `minWidth` / `minHeight` を消し、
`App.tsx` から `<TitleBar />` を外す。CSS の `.app { padding-top }` も戻す。
