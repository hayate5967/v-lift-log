'use client';

import { useState, useTransition } from 'react';
import { RecordListItem } from '@/components/RecordListItem';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { RecordItem } from '@/lib/api/types';
import { PAGE_LIMIT } from '@/lib/api/records';
import { loadMoreOwnRecordsAction } from './actions';

export function RecordsList({
  initialRecords,
}: {
  initialRecords: RecordItem[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [hasMore, setHasMore] = useState(initialRecords.length >= PAGE_LIMIT);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    const last = records[records.length - 1];
    if (!last) {
      return;
    }
    setError(undefined);
    startTransition(async () => {
      try {
        const more = await loadMoreOwnRecordsAction(last.id);
        setRecords((prev) => [...prev, ...more]);
        setHasMore(more.length >= PAGE_LIMIT);
      } catch {
        setError('読み込みに失敗しました。もう一度お試しください。');
      }
    });
  };

  if (records.length === 0) {
    return <p className="text-sm text-zinc-500">まだ記録がありません。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <li key={record.id}>
            <RecordListItem record={record} />
          </li>
        ))}
      </ul>
      <ErrorText>{error}</ErrorText>
      {hasMore && (
        <Button variant="secondary" onClick={loadMore} disabled={isPending}>
          {isPending ? '読み込み中…' : 'もっと見る'}
        </Button>
      )}
    </div>
  );
}
