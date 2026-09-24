import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { me } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { getToken } from '@/lib/session';
import { BottomNav } from '@/components/BottomNav';
import { logoutAction } from './actions';

/**
 * 本人確認の正。proxy.ts（Next.js 16の新規約。旧middleware）はCookieの有無だけを見る
 * 軽量ガードなので、ここで毎回 GET /auth/me を呼び、失効・不正なtokenは401としてログインへ戻す。
 */
export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getToken();
  if (!token) {
    redirect('/login');
  }

  let userName: string;
  try {
    const { user } = await me(token);
    userName = user.name;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      // Server Component描画中はCookieを書き換えられないため、Route Handler
      // （/session-expired）を経由してCookieを消してから/loginへ戻す。
      redirect('/session-expired');
    }
    throw e;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col pb-16">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <span className="text-sm font-medium text-zinc-700">{userName}</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ログアウト
          </button>
        </form>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
