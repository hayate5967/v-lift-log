import { useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { RecordItem } from '@/lib/api/types';
import { PAGE_LIMIT } from '@/lib/api/records';

/**
 * /records・/feed・/groups/[id]の「もっと見る」で共用するページング状態。
 * loadMoreにはcursor(最後の記録のid)を渡すとその続きを返すServer Actionを渡す。
 */
export function usePaginatedRecords(
  initialRecords: RecordItem[],
  loadMore: (cursor: string) => Promise<RecordItem[]>,
) {
  const [records, setRecords] = useState(initialRecords);
  const [hasMore, setHasMore] = useState(initialRecords.length >= PAGE_LIMIT);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const loadMoreRecords = () => {
    const last = records[records.length - 1];
    if (!last) {
      return;
    }
    setError(undefined);
    startTransition(async () => {
      try {
        const more = await loadMore(last.id);
        setRecords((prev) => [...prev, ...more]);
        setHasMore(more.length >= PAGE_LIMIT);
      } catch (e) {
        // セッション切れ時、Server Action内のredirect('/session-expired')は
        // 特殊なthrowとしてここに届く。素通しして遷移させないと、下のsetErrorに
        // 飲み込まれて画面に留まり続けてしまう。
        unstable_rethrow(e);
        setError('読み込みに失敗しました。もう一度お試しください。');
      }
    });
  };

  return { records, hasMore, error, isPending, loadMore: loadMoreRecords };
}
