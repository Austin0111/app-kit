# app-kit

新規デスクトップアプリの雛形。
`.dev/開発系メモ/棚卸し/` の棚卸し結果をもとに、**次のアプリが初日から要るもの**だけを詰めてある。

**使い方**: このフォルダごとコピーして名前を変える。既存アプリを触る話ではない。

## 名前の決まり

`src/shared/app-meta.ts` が唯一の出所。**表示名と内部識別子を分離**してあるので、
表示名はいつでも変えられる。

| | 例 | 可変 | 使われる場所 |
|---|---|---|---|
| `INTERNAL_NAME` | `app-kit` | **不変** | userData フォルダ名 / DB / バックアップ名 |
| `DISPLAY_NAME` | `app-kit` | **可変** | ウィンドウタイトル / タイトルバー / About |
| `APP_ID` | `dev.austin.app-kit` | **不変** | AppUserModelID / electron-builder |

### 新しいアプリを作るとき

1. `app-meta.ts` の 3 つを決める（この時点なら `INTERNAL_NAME` も自由）
2. `package.json` の `name` / `build.productName` / `build.appId` を合わせる
3. `npm run check:names` でズレていないか確認

### 表示名を変えるとき

`DISPLAY_NAME` と `package.json` の `build.productName` の **2 箇所**を書き換えて
`npm run check:names`。**それ以外は触らない**（触ると保存先が動く）。

> **`INTERNAL_NAME` は後から変えないこと。** userData の場所が変わり、
> 既存の設定・DB・バックアップを見失う。

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
| `src/main/log/` | ログ基盤。伏せ字・ローテーション込み（下記） |
| `src/main/crash-log.ts` | 未処理例外をログへ残す。**何よりも先に仕掛ける** |
| `src/main/window.ts` | 窓制御（最小化 / 最大化 / 閉じる）と最大化状態の push |
| `src/renderer/src/ui/` | カスタムタイトルバー、モーダル（confirm / prompt / 任意ボタン）、トースト |
| `src/main/spawn.ts` | 外部プロセス起動。**どこからも import していない。要らなければ消してよい** |

`notes` テーブルと画面上の一覧は**動作確認用**。新アプリでは消してよい。

## マイグレーション

`src/main/db/schema.ts` を編集して `npm run db:generate` を叩くと、
`drizzle/` に差分 SQL が生成される。適用は起動時に自動。

**`drizzle/` は commit する**（適用履歴そのもの）。`.gitignore` に入れてはいけない。

## ログ

`userData/logs/` に出る。**不具合報告としてそのまま渡せる形**を目指している。

| ファイル | 用途 |
|---|---|
| `app.jsonl` | 全レベルを 1 行 1 JSON。機械が読む用。5MB × 3 世代 |
| `error.log` | warn / error だけを整形。**人がそのまま貼れる**。2MB × 3 世代 |

```ts
log.error('APIの呼び出しに失敗した', {
  API: 'https://example.com/v2/user',
  HTTP: 429,
  'Request ID': 'req_abc123',
  Response: 'rate limit exceeded'
})
```

```
[エラー] APIの呼び出しに失敗した
  発生       : 2026/7/20 8:48:52
  API        : https://example.com/v2/user
  HTTP       : 429
  Request ID : req_abc123
  Response   : rate limit exceeded
```

- **秘密情報は書き出し時に自動で伏せる**（`log/redact.ts`）。キー名に `token` `password`
  `api_key` `authorization` 等を含むもの、URL のクエリ、`Bearer xxx` が対象。
  **消さずに `***` に置き換える**（「無かった」のか「あったが誤り」なのかを区別するため）
- **ローテーションはサイズ主**。日数だと容量が抑えられない（クローラー等は 1 日で数百MB）。
  饒舌なログが見たいエラーを押し出す問題は、error.log を別系統にして解いている
- **画面側の例外も記録する**。これが無いと React の不具合が DevTools にしか出ない
- `debug` は既定で書かない。設定の `debugLogging` で有効化する

## 秘密情報（APIキー・トークン）

`src/main/secrets.ts`。Electron の `safeStorage`（Windows は DPAPI）で暗号化して
設定テーブルに置く。**まず「保存しなくて済まないか」を疑うこと**が最善策。

```ts
secrets.set('openaiApiKey', key)   // 保存
secrets.get('openaiApiKey')        // 取り出し（main 側だけ）
secrets.status('openaiApiKey')     // 'unset' | 'ok' | 'plaintext' | 'undecryptable'
```

**守れるもの / 守れないもの**

| | |
|---|---|
| 守れる | 別アカウントからの閲覧、他PCへの持ち出し、**うっかり漏れ**（クラウド同期・画面共有・不具合報告への添付・git へのコミット） |
| 守れない | **同じユーザー権限で動くマルウェア**。同じ API を呼べば復号できる |

「盗まれない」仕組みではなく「平文で転がっていない」仕組み。
現実に起きるのは圧倒的に前者なので、それを塞ぐ意味で使う。

- **レンダラーへ値を渡す口は用意していない**。平文が IPC を渡ってレンダラーの
  メモリに残るのを避けるため。秘密を使う処理は main 側に置く
- **バックアップとの関係（方針A）**: 暗号化済みのままバックアップに入るが、
  **別PCでは復号できない**。復元後は入れ直してもらう。
  バックアップzipに平文の鍵が乗る方が危険なので、利便性より安全を採った。
  起動時に復号できない項目を検出してログに警告を出す（黙って失敗すると
  「なぜか繋がらない」と悩ませることになるため）

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
