'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RecordItem } from '@/lib/api/types';
import { FEED_PAGE_LIMIT } from '@/lib/api/records';
import { loadMoreFeedAction } from './actions';

interface FeedListProps {
  initialRecords: RecordItem[];
  groupId?: string;
}

export function FeedList({ initialRecords, groupId }: FeedListProps) {
  const [records, setRecords] = useState(initialRecords);
  const [hasMore, setHasMore] = useState(
    initialRecords.length >= FEED_PAGE_LIMIT,
  );
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    const last = records[records.length - 1];
    if (!last) {
      return;
    }
    startTransition(async () => {
      const more = await loadMoreFeedAction(last.id, groupId);
      setRecords((prev) => [...prev, ...more]);
      setHasMore(more.length >= FEED_PAGE_LIMIT);
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
            <Link href={`/records/${record.id}`}>
              <Card>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{record.exercise.name}</span>
                  <span className="text-sm text-zinc-500">
                    {new Date(record.performedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{record.user.name}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button variant="secondary" onClick={loadMore} disabled={isPending}>
          {isPending ? '読み込み中…' : 'もっと見る'}
        </Button>
      )}
    </div>
  );
}
