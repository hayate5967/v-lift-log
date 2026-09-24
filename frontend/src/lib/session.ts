import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from './constants';

// backendのJWT_EXPIRES_IN既定値（7d）に合わせる。ADR-0009: tokenはhttpOnly Cookieに
// フロント側で詰め替える（backendはSet-Cookieを発行しない）。
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function getToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
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
