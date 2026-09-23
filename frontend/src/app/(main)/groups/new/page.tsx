'use client';

import { useActionState } from 'react';
import { createGroupAction, type GroupFormState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';

const initialState: GroupFormState = {};

export default function NewGroupPage() {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">グループを作成</h1>
      <form
        action={formAction}
        onSubmit={(e) => {
          // HTML5のrequiredは空白のみの値を通してしまい、backendの
          // MinLength違反（未ローカライズの英語メッセージ）がそのまま出てしまうため、
          // 送信前に弾く。
          const value = new FormData(e.currentTarget).get('name');
          if (typeof value !== 'string' || value.trim() === '') {
            e.preventDefault();
          }
        }}
        className="flex flex-col gap-4"
      >
        <Input
          label="グループ名"
          name="name"
          type="text"
          required
          maxLength={50}
        />
        <ErrorText>{state.error}</ErrorText>
        <Button type="submit" disabled={pending}>
          {pending ? '作成中…' : '作成する'}
        </Button>
      </form>
    </div>
  );
}
