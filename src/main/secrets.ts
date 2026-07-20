import { safeStorage } from 'electron'
import { eq } from 'drizzle-orm'
import { settings as settingsTable } from './db/schema'
import type { Db } from './db'
import { log } from './log'

/**
 * APIキー・トークン等の秘密情報の保管。
 *
 * 【何を守れて、何を守れないか】
 * safeStorage は Windows では DPAPI を使い、鍵が **ユーザーアカウント＋マシン** に紐づく。
 *   守れる   … 別アカウントからの閲覧、他PCへの持ち出し、**うっかり漏れ**
 *              （設定のクラウド同期・画面共有・不具合報告への添付・git へのコミット）
 *   守れない … **同じユーザー権限で動くマルウェア**。同じ API を呼べば復号できる
 * つまり「盗まれない」仕組みではなく「平文で転がっていない」仕組み。
 * 現実に起きるのは圧倒的に前者（うっかり漏れ）なので、それを塞ぐ意味で採用している。
 *
 * 【最善は「そもそも保存しないこと」】
 * 保存が要るか先に疑うこと。ehentai_dl はログイン済みブラウザのプロファイルを借りる
 * 方式にしたため、パスワードの保存自体が本来不要だった。
 *
 * 【バックアップとの関係（方針A）】
 * 暗号化済みの値はそのままバックアップに入るが、**別PCでは復号できない**。
 * 復元後は「入れ直してもらう」方針を採る。
 * バックアップzipに平文の鍵が乗る方が危険なので、利便性より安全を採った。
 */

/** 設定テーブル内での接頭辞。通常の設定と同居させるが名前空間を分ける。 */
const PREFIX = 'secret:'

export type SecretStatus =
  /** 未設定 */
  | 'unset'
  /** 読める */
  | 'ok'
  /** 保存されているが復号できない（別PCへ復元した等）。入れ直しが要る */
  | 'undecryptable'
  /** 暗号化できない環境だったため平文で入っている */
  | 'plaintext'

type Stored = { enc: boolean; value: string }

export class SecretStore {
  constructor(private readonly db: Db['db']) {}

  private read(key: string): Stored | null {
    const rows = this.db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, PREFIX + key))
      .all()
    const raw = rows[0]?.value
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Stored
      return typeof parsed?.value === 'string' ? parsed : null
    } catch {
      return null
    }
  }

  /**
   * 保存する。暗号化できない環境では平文で妥協するが、
   * **その事実を保存形式に残す**（後から状態を正しく判定できるように）。
   */
  set(key: string, value: string): void {
    const canEncrypt = safeStorage.isEncryptionAvailable()
    if (!canEncrypt) {
      log.warn('この環境では暗号化が使えないため、秘密情報を平文で保存する', { 項目: key })
    }
    const stored: Stored = canEncrypt
      ? { enc: true, value: safeStorage.encryptString(value).toString('base64') }
      : { enc: false, value }

    this.db
      .insert(settingsTable)
      .values({ key: PREFIX + key, value: JSON.stringify(stored) })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: { value: JSON.stringify(stored) }
      })
      .run()
  }

  /**
   * 取り出す。復号できなければ null。
   * **main プロセスの中だけで使うこと。**レンダラーへ渡さない（下の理由参照）。
   */
  get(key: string): string | null {
    const stored = this.read(key)
    if (!stored) return null
    if (!stored.enc) return stored.value
    try {
      if (!safeStorage.isEncryptionAvailable()) return null
      return safeStorage.decryptString(Buffer.from(stored.value, 'base64'))
    } catch {
      // 別のPC・別アカウントへ持ち込まれた場合はここに来る
      return null
    }
  }

  /** 値そのものを渡さずに状態だけ答える。UI の表示はこれを使う。 */
  status(key: string): SecretStatus {
    const stored = this.read(key)
    if (!stored) return 'unset'
    if (!stored.enc) return 'plaintext'
    try {
      if (!safeStorage.isEncryptionAvailable()) return 'undecryptable'
      safeStorage.decryptString(Buffer.from(stored.value, 'base64'))
      return 'ok'
    } catch {
      return 'undecryptable'
    }
  }

  clear(key: string): void {
    this.db.delete(settingsTable).where(eq(settingsTable.key, PREFIX + key)).run()
  }

  /**
   * 復号できなくなっている項目を挙げる。
   * 起動時に確認して「入れ直してくれ」と促すために使う。
   * **黙って失敗すると、利用者は原因が分からないまま「繋がらない」と悩むことになる。**
   */
  listUndecryptable(): string[] {
    const rows = this.db.select().from(settingsTable).all()
    return rows
      .filter((r) => r.key.startsWith(PREFIX))
      .map((r) => r.key.slice(PREFIX.length))
      .filter((k) => this.status(k) === 'undecryptable')
  }
}
