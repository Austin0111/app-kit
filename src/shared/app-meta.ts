/**
 * アプリの名前と識別子。**ここが唯一の出所**。
 *
 * 表示名をいつでも変えられるようにするため、「内部識別子」と「表示名」を分ける。
 * 棚卸しで Oto棚（AppConstants）・CommandDeck（config.js）・PixNest（appInfo.js）が
 * それぞれ独立に同じ結論へ到達していた。
 *
 * ┌──────────────┬──────────┬────────────────────────────────────────┐
 * │ INTERNAL_NAME│ **不変** │ userData フォルダ名 / DB ファイル名 / バックアップ名 │
 * │ DISPLAY_NAME │ 可変     │ ウィンドウタイトル / タイトルバー / About        │
 * │ APP_ID       │ **不変** │ AppUserModelID / electron-builder の appId     │
 * └──────────────┴──────────┴────────────────────────────────────────┘
 *
 * 【改名するとき】DISPLAY_NAME だけ書き換える。
 * package.json の `build.productName`（インストーラの表示名）も合わせること。
 * ズレていないかは `npm run check:names` で確かめられる。
 *
 * 【INTERNAL_NAME を後から変えてはいけない】
 * userData の場所が変わり、**既存ユーザーの設定・DB・バックアップが行方不明になる**。
 */

/** 内部識別子。フォルダ名・ファイル名に使う。**後から変えない**。 */
export const INTERNAL_NAME = 'app-kit'

/** 雛形の開発専用 UI にだけ使う。派生アプリ生成時に false へ置換する。 */
export const IS_TEMPLATE = true

/** 表示名。UI に出るのはこれだけ。いつでも変えてよい。 */
export const DISPLAY_NAME = 'app-kit'

/**
 * アプリ ID（逆ドメイン形式）。**後から変えない**。
 * Windows ではタスクバーのグループ化・通知・SMTC の識別に使われる。
 * インストーラ側のショートカットにも同じ値を設定すること
 *（Oto棚では、ここが食い違って「不明なアプリケーション」と表示される問題が起きた）。
 */
export const APP_ID = 'dev.austin.app-kit'

/** DB ファイル名。表示名ではなく内部識別子から作る。 */
export const DB_FILENAME = `${INTERNAL_NAME}.db`

declare const __APP_VERSION__: string

/**
 * アプリの版。**ビルド時に package.json から埋め込まれる**（electron.vite.config.ts）。
 *
 * `app.getVersion()` を使ってはいけない。起動のされ方で値が変わり、
 * `electron out/main/index.js` 形式では **Electron 自身の版を返す**。
 * 表示にも更新比較にも使う値なので、間違えると永久に「更新なし」になる。
 */
export const APP_VERSION = __APP_VERSION__
