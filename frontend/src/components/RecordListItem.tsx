import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { RecordItem } from '@/lib/api/types';
import { formatDate } from '@/lib/date';

/** /records・/feed で共用する記録一覧の1行分の表示。 */
export function RecordListItem({
  record,
  showOwner = false,
}: {
  record: RecordItem;
  showOwner?: boolean;
}) {
  return (
    <Link href={`/records/${record.id}`}>
      <Card>
        <div className="flex items-center justify-between">
          <span className="font-medium">{record.exercise.name}</span>
          <span className="text-sm text-zinc-500">
            {formatDate(record.performedAt)}
          </span>
        </div>
        {showOwner ? (
          <p className="mt-1 text-xs text-zinc-500">{record.user.name}</p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            {record.sets.length}セット
          </p>
        )}
      </Card>
    </Link>
  );
}
