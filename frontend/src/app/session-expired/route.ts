import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

/**
 * Server Component（layout/page描画中）からはCookieを書き換えられない
 * （Next.jsの制約: "Cookies can only be modified in a Server Action or Route Handler"）。
 * GET /auth/me が401を返した際、失効/不正なtokenをCookieに残したままredirectすると
 * proxy.tsはCookieの有無しか見ないため /login と保護ページを無限に往復してしまう。
 * そのためRoute Handlerであるここを経由し、Cookieを消してから/loginへ戻す。
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
