'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction, type AuthFormState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';

const initialState: AuthFormState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">新規登録</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <Input label="名前" name="name" type="text" required maxLength={50} />
        <Input
          label="メールアドレス"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <Input
          label="パスワード（8文字以上）"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
        />
        <ErrorText>{state.error}</ErrorText>
        <Button type="submit" disabled={pending}>
          {pending ? '登録中…' : '登録する'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        アカウントをお持ちの場合は{' '}
        <Link href="/login" className="font-medium text-blue-600">
          ログイン
        </Link>
      </p>
    </div>
  );
}
