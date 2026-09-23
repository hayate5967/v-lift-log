'use client';

import { useActionState } from 'react';
import { joinGroupAction, type GroupFormState } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';

const initialState: GroupFormState = {};

export default function JoinGroupPage() {
  const [state, formAction, pending] = useActionState(
    joinGroupAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">グループに参加</h1>
      <form
        action={formAction}
        onSubmit={(e) => {
          // HTML5のrequiredは空白のみの値を通してしまい、backendの
          // MinLength違反（未ローカライズの英語メッセージ）がそのまま出てしまうため、
          // 送信前に弾く。
          const value = new FormData(e.currentTarget).get('joinCode');
          if (typeof value !== 'string' || value.trim() === '') {
            e.preventDefault();
          }
        }}
        className="flex flex-col gap-4"
      >
        <Input
          label="参加コード"
          name="joinCode"
          type="text"
          required
          autoCapitalize="characters"
          className="font-mono tracking-widest uppercase"
        />
        <ErrorText>{state.error}</ErrorText>
        <Button type="submit" disabled={pending}>
          {pending ? '参加中…' : '参加する'}
        </Button>
      </form>
    </div>
  );
}
