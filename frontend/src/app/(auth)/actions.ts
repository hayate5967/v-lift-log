'use server';

import { redirect } from 'next/navigation';
import { login, register } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { setToken } from '@/lib/session';

export interface AuthFormState {
  error?: string;
}

/**
 * login/registerで共通の「呼んでtokenが取れたらCookieに保存、
 * ApiErrorはフォームに表示するメッセージへ変換」処理。
 * 成功時はundefinedを返す（呼び出し側でredirectする）。
 */
async function runAuthAction(
  call: () => Promise<{ token: string }>,
): Promise<AuthFormState | undefined> {
  try {
    const { token } = await call();
    await setToken(token);
    return undefined;
  } catch (e) {
    if (e instanceof ApiError) {
      return { error: e.message };
    }
    return { error: '通信エラーが発生しました' };
  }
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const result = await runAuthAction(() => login({ email, password }));
  if (result) {
    return result;
  }

  redirect('/feed');
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '');

  const result = await runAuthAction(() => register({ email, password, name }));
  if (result) {
    return result;
  }

  redirect('/feed');
}
