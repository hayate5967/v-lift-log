'use server';

import { redirect } from 'next/navigation';
import { login, register } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { setToken } from '@/lib/session';

export interface AuthFormState {
  error?: string;
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  try {
    const { token } = await login({ email, password });
    await setToken(token);
  } catch (e) {
    if (e instanceof ApiError) {
      return { error: e.message };
    }
    return { error: '通信エラーが発生しました' };
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

  try {
    const { token } = await register({ email, password, name });
    await setToken(token);
  } catch (e) {
    if (e instanceof ApiError) {
      return { error: e.message };
    }
    return { error: '通信エラーが発生しました' };
  }

  redirect('/feed');
}
