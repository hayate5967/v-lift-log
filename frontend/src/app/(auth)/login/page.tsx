'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type AuthFormState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';

const initialState: AuthFormState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">ログイン</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <Input
          label="メールアドレス"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <Input
          label="パスワード"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <ErrorText>{state.error}</ErrorText>
        <Button type="submit" disabled={pending}>
          {pending ? 'ログイン中…' : 'ログイン'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        アカウントが無い場合は{' '}
        <Link href="/register" className="font-medium text-blue-600">
          新規登録
        </Link>
      </p>
    </div>
  );
}
