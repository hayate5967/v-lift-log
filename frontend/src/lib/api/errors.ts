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

/**
 * Server Componentでの`.catch(redirectOn401OrNotFoundOn404)`用。requireUser(token)
 * と同じリクエストの中で本体データ取得（例: getRecord）もPromise.allで並行実行する
 * 場合、両方が同時に401を返しうる。Promise.allは先に確定した方の結果で全体の
 * reject理由が決まるため、データ取得側の生のApiErrorが先に外へ出てCookie未削除の
 * まま汎用エラー画面に落ちることがある。データ取得側のcatchでも401を
 * redirectOn401と同じ経路に倒しておくことで、どちらが先に確定してもrequireUser()
 * と同じ/session-expiredへの遷移になり、レースそのものを無害化する。
 */
export function redirectOn401OrNotFoundOn404(e: unknown): never {
  redirectOn401(e);
  notFoundOn404(e);
}

/**
 * Server Actionの「呼んで成功なら値を返す、401ならredirectOn401、それ以外の
 * ApiErrorはフォームに出すメッセージへ変換する」という繰り返しの多い形を
 * 共通化する。呼び出し側は`if (!result.ok) return { error: result.error }`の
 * 後、`result.value`を使って残りの処理（revalidatePath・redirect等）を続ける。
 */
export async function runMutationAction<T>(
  call: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await call() };
  } catch (e) {
    redirectOn401(e);
    return {
      ok: false,
      error: e instanceof ApiError ? e.message : '通信エラーが発生しました',
    };
  }
}
