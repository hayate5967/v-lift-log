import { notFound, redirect } from 'next/navigation';

/** docs/api-spec.md 1.4「エラーレスポンス形式」。 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('\n') : body.message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Server Componentでの`.catch(notFoundOn404)`用。backendの404（閲覧不可/不在。
 * 非会員に存在有無を漏らさない設計）をNext.jsのnotFound()にそのまま変換する。
 * 404以外はそのまま再throwし、呼び出し元やapp/(main)/error.tsxに委ねる。
 */
export function notFoundOn404(e: unknown): never {
  if (e instanceof ApiError && e.status === 404) {
    notFound();
  }
  throw e;
}

/**
 * Server Actionでの`catch (e) { redirectOn401(e); ...通常のエラー処理 }`用。
 * requireToken()はCookieの有無しか見ないため、期限切れ等で失効したtokenの
 * ままsubmitするとここで初めて401が分かる。lib/session.tsのrequireUser()と
 * 同じ経路（Cookie削除+/loginへの巻き戻り）に揃え、フォームへ生のエラー
 * メッセージを出したまま行き詰まらせない。401以外は何もせず戻り、
 * 呼び出し元の既存のcatch処理に委ねる。
 */
export function redirectOn401(e: unknown): void {
  if (e instanceof ApiError && e.status === 401) {
    redirect('/session-expired');
  }
}
