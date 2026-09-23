import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { me } from './api/auth';
import { ApiError } from './api/errors';
import { PublicUser } from './api/types';
import { SESSION_COOKIE_NAME } from './constants';

// backendのJWT_EXPIRES_IN既定値（7d）に合わせる。ADR-0009: tokenはhttpOnly Cookieに
// フロント側で詰め替える（backendはSet-Cookieを発行しない）。
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function getToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * (main)配下のページ・Server Actionで使う。(main)/layout.tsxが未認証を弾く前提だが、
 * それに依存せず自衛的にredirectする（TypeScript上もstring非nullを保証できる）。
 */
export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    redirect('/login');
  }
  return token;
}

/**
 * (main)配下のページで「今ログイン中の本人」を取得する共通ヘルパー。
 * 401（token失効/不正）は/session-expiredへ横流しし、Cookie削除+/loginへの
 * 巻き戻りを一箇所に集約する（(main)/layout.tsxと同じ挙動を各ページでも揃える。
 * 各ページが個別にme()を呼んでcatch漏れすると、layoutとは違う汎用エラー画面に
 * 落ちてしまうため）。
 */
export async function requireUser(token: string): Promise<PublicUser> {
  try {
    const { user } = await me(token);
    return user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      redirect('/session-expired');
    }
    throw e;
  }
}

export async function setToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
