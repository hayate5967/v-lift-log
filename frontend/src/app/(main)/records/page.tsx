import Link from 'next/link';
import { requireToken } from '@/lib/session';
import { listOwnRecords } from '@/lib/api/records';
import { Button } from '@/components/ui/Button';
import { PaginatedRecordsList } from '@/components/PaginatedRecordsList';
import { loadMoreOwnRecordsAction } from './actions';

export default async function RecordsPage() {
  const token = await requireToken();
  const records = await listOwnRecords(token);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/records/new">
        <Button>+ 記録を追加</Button>
      </Link>
      <PaginatedRecordsList
        initialRecords={records}
        loadMore={loadMoreOwnRecordsAction}
        emptyMessage="まだ記録がありません。"
      />
    </div>
  );
}
