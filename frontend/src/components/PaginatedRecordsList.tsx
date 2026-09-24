'use client';

import { RecordListItem } from '@/components/RecordListItem';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { RecordItem } from '@/lib/api/types';
import { usePaginatedRecords } from '@/lib/usePaginatedRecords';

/** /records・/feed・/groups/[id] で共用する「もっと見る」付きの記録一覧。 */
export function PaginatedRecordsList({
  initialRecords,
  loadMore,
  showOwner = false,
  emptyMessage,
}: {
  initialRecords: RecordItem[];
  loadMore: (cursor: string) => Promise<RecordItem[]>;
  showOwner?: boolean;
  emptyMessage: string;
}) {
  const {
    records,
    hasMore,
    error,
    isPending,
    loadMore: loadMoreRecords,
  } = usePaginatedRecords(initialRecords, loadMore);

  if (records.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <li key={record.id}>
            <RecordListItem record={record} showOwner={showOwner} />
          </li>
        ))}
      </ul>
      <ErrorText>{error}</ErrorText>
      {hasMore && (
        <Button
          variant="secondary"
          onClick={loadMoreRecords}
          disabled={isPending}
        >
          {isPending ? '読み込み中…' : 'もっと見る'}
        </Button>
      )}
    </div>
  );
}
