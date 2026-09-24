import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

const PUBLIC_PATHS = ['/login', '/register'];

/**
 * Cookieの有無だけを見た軽量なUXガード。認可の実体はbackendが持つため、
 * これ自体をセキュリティ境界にはしない（本人確認の正はGET /auth/me、(main)/layout.tsx参照）。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(SESSION_COOKIE_NAME);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!hasToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (hasToken && isPublicPath) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|next.svg|vercel.svg).*)',
  ],
};
