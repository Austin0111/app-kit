# app-kit

新規デスクトップアプリの雛形。
`.dev/開発系メモ/棚卸し/` の棚卸し結果をもとに、**次のアプリが初日から要るもの**だけを詰めてある。

## 新しいアプリを作る

```
node scripts/create-app.mjs <内部識別子> --display "表示名"
```

例:

```
node scripts/create-app.mjs manga-shelf --display "漫画棚"
```

複製・名前の差し替え・CHANGELOG の初期化・git init まで自動でやる。
**依存の導入だけは手で行う**（下記の3手順でElectron本体とnative moduleを揃える）。

既存アプリを触る話ではない。雛形からの新規作成のためのもの。

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

Electron 44 / electron-vite / React 18 / TypeScript / better-sqlite3 / Drizzle ORM

## セットアップ

```
npm install --ignore-scripts
node node_modules/electron/install.js
npx electron-rebuild -w better-sqlite3
```

**この3手順で入れること。** `--ignore-scripts`で依存導入時の任意スクリプトを止め、
Electron本体を明示的に取得してからnative moduleを対象Electronへ揃える。
better-sqlite3 13はN-API prebuildを同梱するが、将来native依存が増えても同じ手順を使う。

```
npm run dev         開発起動
npm run typecheck   型検査
npm run verify      型・名前・ビルド・テストをまとめて確認
npm run release:verify  verify・配布物作成・配布版起動・版整合を一括確認
npm run dist        インストーラを作る（dist/ に出る）
npm run test:packaged 配布版を必須として起動確認（無ければ失敗）
npm run test:installer NSIS版を一時導入し、起動・DB・削除まで確認（既存導入時は中止）
npm run db:generate スキーマ変更後のマイグレーション生成
```

`test:installer`は現在のWindowsユーザーに同名アプリの登録またはショートカットがある場合、
既存環境へ干渉しないよう開始前に失敗する。通常は`release:verify`から実行する。

> `@electron/rebuild` は electron-builder も内部で使うため「重複」と警告が出るが、
> **上のセットアップ手順が `electron-rebuild` を直接叩く**ので直接依存のまま残している。
> 間接依存の実行ファイルに頼るのは脆い。

## 入っているもの

| 場所 | 中身 |
|---|---|
| `src/shared/settings.ts` | 設定の型と既定値。**ここ 1 箇所**で定義し main / renderer 双方から参照する |
| `src/main/settings.ts` | 設定KV の永続化。値は JSON 文字列で 1 列に持つ。変更は全ウィンドウへ配信 |
| `src/main/db/` | DB とマイグレーション適用。スキーマは `schema.ts` |
| `src/main/backup.ts` | バックアップ／復元。自動世代管理つき |
| `src/main/log/` | ログ基盤。伏せ字・ローテーション込み（下記） |
| `src/main/crash-log.ts` | 未処理例外をログへ残し、mainの不定状態では安全終了する。**何よりも先に仕掛ける** |
| `src/main/recovery.ts` | renderer停止・応答停止を利用者へ知らせ、再読込ループを防ぐ |
| `src/main/diagnostics.ts` | 秘密・設定値・DBを含めない診断ZIPを作る |
| `src/main/security.ts` | sandbox、画面遷移・権限の拒否、main frame限定IPC |
| `src/main/ipc-validation.ts` | rendererから届く値の実行時検証 |
| `src/shared/ipc-channels.ts` | preload↔mainのチャンネル契約。追加時はここへ集約する |
| `src/main/window.ts` | 窓制御（最小化 / 最大化 / 閉じる）と最大化状態の push |
| `src/renderer/src/ui/` | カスタムタイトルバー、モーダル（confirm / prompt / 任意ボタン）、トースト |
| `src/main/spawn.ts` | 外部プロセス起動。**どこからも import していない。要らなければ消してよい** |

`notes` テーブルと画面上の一覧は**動作確認用**。新アプリでは消してよい。

### 外部Webコンテンツを埋め込む場合

新規実装はmainプロセスで管理する`WebContentsView`を使う。`BrowserView`はElectron 29以降で
非推奨、`<webview>`もElectron公式の推奨外なので、新しい派生アプリへ持ち込まない。
DOM上の表示領域と座標を同期する必要があるため、導入時はリサイズ・拡大率・スクロール・
破棄処理に加えて、外部遷移、popup、権限、preload、partitionを実Electronで検証する。

## マイグレーション

既存DBへ未適用マイグレーションがある時は、適用直前にOnline Backup APIで
`backups/pre_migration_*.db`を作る。成功時は削除し、失敗時は起動を止めて退避を残す。
通常バックアップの世代管理・復元一覧には混ぜない。

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

- **秘密情報は書き出し時に自動で伏せる**（`log/redact.ts`）。ログ本文と付随情報の両方で、
  キー名に `token` `password` `api_key` `authorization` 等を含むもの、URL のクエリ、
  `Bearer xxx`、URL埋め込みのBasic認証が対象。
  **消さずに `***` に置き換える**（「無かった」のか「あったが誤り」なのかを区別するため）
- **ローテーションはサイズ主**。日数だと容量が抑えられない（クローラー等は 1 日で数百MB）。
  饒舌なログが見たいエラーを押し出す問題は、error.log を別系統にして解いている
- **画面側の例外も記録する**。これが無いと React の不具合が DevTools にしか出ない
- `debug` は既定で書かない。設定の `debugLogging` で有効化する

画面の「診断情報ZIPを作る」は、版・実行環境・DBの`quick_check`・直近の障害概要・
再伏せ字したログだけを固定allowlistで出力する。設定はキーと型だけで値を含めず、
DB・バックアップ・秘密情報・ユーザーのローカルパスは含めない。

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
  `.restore` に待避して次回起動時に適用する。復元元は自アプリのバックアップフォルダ
  直下に限定し、`quick_check`と必須schemaを確認してから待避する
- **rendererの型は防御にならない**。画面が侵害された場合も想定し、特権IPCの入力は
  main側で検証する。外部URLはrendererから受け取らず、main側のallowlistや固定値から作る
- **`setState` の更新関数に副作用を書かない**（`setTimeout` / id 採番 / `resolve`）。
  StrictMode は更新関数を 2 回呼ぶ
- **React 18 は `<dialog>` の `cancel` / `close` を合成イベント化していない**（React 19 から）。
  `onCancel` では Esc が拾えないので ref 経由でネイティブに張る
- **子プロセスの出力は UTF-8 とは限らない**。Windows の既定コードページは CP932。
  詳細と対処は `src/main/spawn.ts` の冒頭コメント
- **アイコンは `build/` と `assets/` の両方に置く**。`build/` は electron-builder が
  読むもので **asar に入らない**（実行中には読めない）。トレイ等が実行時に読むものは
  `assets/` に要る。ウィンドウのアイコンは読込失敗すると exe 埋め込みへ自動で
  フォールバックするため気づきにくく、**フォールバックの無い Tray だけが壊れる**
  という分かりにくい症状になる（CharaLauncher が踏んだ）。
  仮のアイコンは `node scripts/make-icon.mjs` で作れる
- **メニューバーを消している**（`Menu.setApplicationMenu(null)`）。自前タイトルバーと
  二重になるため。入力欄の編集操作（Ctrl+A 等）は消しても効くことを確認済みだが、
  独自のショートカットが要るなら最小のメニューを作って割り当てること
- **タイトルバーに操作要素を足したら `-webkit-app-region: no-drag` を当てる**。
  忘れるとクリックがドラッグ領域に飲まれて反応しなくなる
- **最大化状態は main から push で受け取る**。最大化はボタン以外でも起きる
  （画面端スナップ・バーのダブルクリック・Win+↑）ので、ボタン押下時だけ更新すると
  アイコンが実際とズレる
- **main → renderer への push は `src/main/ipc-safe.ts` の `safeSend()` を通すこと**。
  ウィンドウが閉じた直後に非同期処理（外部コマンド・fetch等）が完了して push しようと
  すると、`webContents.send()` が `Object has been destroyed` で例外を投げることがある
  （映棚が実際に踏んだ）。`isDestroyed()` を各所で個別にチェックするより、送信そのものを
  ここに集約しておく方が、送信箇所が増えても書き忘れにくい
- **DB の行に紐づくファイル（添付・キャッシュ画像等）を持つ機能を作ったら、削除時に
  ファイルも一緒に消すこと**。行だけ消してファイルは放置、という実装は動いて見えるため
  気づきにくいが、削除を繰り返すたびディスクにゴミが溜まる（映棚で実際に確認: 死んだ
  行のキャッシュだけで1MB超が孤立していた）。`notes` の削除例（`src/main/index.ts`の
  `notes:remove`）は添付を持たないためこの問題が起きないが、ファイル付きのテーブルを
  足す時は忘れずに対応すること

### 標準のタイトルバーに戻したい場合

`src/main/index.ts` の `frame: false` / `titleBarStyle` / `minWidth` / `minHeight` を消し、
`App.tsx` から `<TitleBar />` を外す。CSS の `.app { padding-top }` も戻す。
