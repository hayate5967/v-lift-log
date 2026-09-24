'use client';

import { RecordListItem } from '@/components/RecordListItem';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { RecordItem } from '@/lib/api/types';
import { usePaginatedRecords } from '@/lib/usePaginatedRecords';
import { loadMoreOwnRecordsAction } from './actions';

export function RecordsList({
  initialRecords,
}: {
  initialRecords: RecordItem[];
}) {
  const { records, hasMore, error, isPending, loadMore } = usePaginatedRecords(
    initialRecords,
    loadMoreOwnRecordsAction,
  );

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
