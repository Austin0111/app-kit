/**
 * ログに秘密情報を書かないための伏せ字処理。
 *
 * 【なぜ要るか】
 * ログは「不具合報告として人や AI に渡す」ことが前提。そのまま貼れる状態でないと
 * 使われないか、使った瞬間に鍵が漏れる。
 * 既存アプリには実際に危ない例がある（My棚は API キーを平文で保持、
 * ehentai_dl はパスワードを平文保存）。**書き出す直前に必ず通す**。
 *
 * 【方針】
 * - 「キー名で判断」を主にする。値の見た目（長い英数字＝トークンっぽい）で判断すると
 *   ID やハッシュまで潰してしまい、肝心の調査ができなくなる
 * - 完全に消さず `***` に置き換える。**あったこと自体は残す**
 *   （「Authorization が付いていなかった」のか「付いていたが誤り」なのかを区別できる）
 */

/** この語を含むキーの値は伏せる。 */
const SECRET_KEY_PATTERNS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'apikey',
  'api_key',
  'api-key',
  'authorization',
  'cookie',
  'credential',
  'private_key',
  'client_secret',
  'session_id',
  'refresh',
  'access_key'
]

export const REDACTED = '***'

function isSecretKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s-]/g, '_')
  return SECRET_KEY_PATTERNS.some((p) => k.includes(p.replace(/-/g, '_')))
}

/** 文字列の中に紛れた秘密を伏せる（URL のクエリ、Bearer トークン等）。 */
export function redactString(text: string): string {
  return (
    text
      // Authorization: Bearer xxxxx。汎用の `authorization:` より先に処理し、
      // 空白で区切られたトークン部分だけが残ることを防ぐ。
      .replace(/(Bearer\s+)[\w.\-~+/]+=*/gi, `$1${REDACTED}`)
      // ログや古いテキストにある `token=...` / `password: ...` 形式。
      .replace(
        /(\b(?:api[-_]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|pwd|secret|authorization|cookie|credential|client[_-]?secret|private[_-]?key|session[_-]?id)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
        `$1${REDACTED}`
      )
      // https://example.com/x?api_key=abc&token=def
      .replace(
        /([?&](?:api[-_]?key|token|access_token|key|secret|password|auth)=)[^&\s]+/gi,
        `$1${REDACTED}`
      )
      // Basic 認証を URL に埋めた形 https://user:pass@host
      // パスワードに @ が含まれることがあるので、**最後の @ まで**を貪欲に取る。
      // `[^/\s@]+` だと最初の @ で切れ、p@ssw0rd の "ssw0rd" が残ってしまう（実際に漏れた）
      .replace(/(\/\/[^/\s:@]+:)[^/\s]+(@[^/\s]*)/g, `$1${REDACTED}$2`)
  )
}

/**
 * ログに載せる値を再帰的に検査して伏せる。
 *
 * 循環参照・巨大オブジェクト・関数など「何が来るか分からない」前提で書く。
 * ここで例外を投げるとログ自体が落ちるので、必ず何かを返す。
 */
export function redact(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  // 深すぎるものは畳む（循環でなくとも巨大なツリーは載せない）
  if (depth > 6) return '[深すぎるため省略]'

  if (value == null) return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return '[関数]'
  if (typeof value === 'symbol') return value.toString()

  if (value instanceof Date) return value.toISOString()

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined
    }
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[循環参照]'
    seen.add(value)

    if (Array.isArray(value)) {
      // 長すぎる配列は先頭だけ残す（ログが読めなくなるのを防ぐ）
      const limit = 50
      const head = value.slice(0, limit).map((v) => redact(v, seen, depth + 1))
      return value.length > limit ? [...head, `…他 ${value.length - limit} 件`] : head
    }

    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSecretKey(k) ? REDACTED : redact(v, seen, depth + 1)
    }
    return out
  }

  return String(value)
}
