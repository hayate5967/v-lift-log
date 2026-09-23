'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * (main)配下（records/feed/groups/stats）で捕捉されなかったエラーの受け皿。
 * 404はnotFound()で個別処理されるためここには来ない。401/403/500等、
 * 各ページのcatchで個別対応していない失敗はここでまとめて日本語メッセージ+
 * 戻り導線を出す（Next.jsの既定エラー画面に落ちるのを防ぐ）。
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <p className="text-sm text-zinc-600">
        {error.message ||
          'エラーが発生しました。しばらくしてからもう一度お試しください。'}
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={() => reset()}>再試行</Button>
        <Link href="/feed">
          <Button variant="secondary">フィードへ戻る</Button>
        </Link>
      </div>
    </div>
  );
}
