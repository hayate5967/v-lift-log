import Link from 'next/link';
import { requireToken } from '@/lib/session';
import { listOwnRecords } from '@/lib/api/records';
import { listExercises } from '@/lib/api/exercises';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function RecordsPage() {
  const token = await requireToken();
  const [records, exercises] = await Promise.all([
    listOwnRecords(token),
    listExercises(token),
  ]);
  const exerciseNameById = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/records/new">
        <Button>+ 記録を追加</Button>
      </Link>

      {records.length === 0 && (
        <p className="text-sm text-zinc-500">まだ記録がありません。</p>
      )}

      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <li key={record.id}>
            <Link href={`/records/${record.id}`}>
              <Card>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {exerciseNameById.get(record.exerciseId) ?? '種目'}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {new Date(record.performedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {record.sets.length}セット
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
