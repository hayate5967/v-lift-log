import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireToken } from '@/lib/session';
import { getRecord } from '@/lib/api/records';
import { listExercises } from '@/lib/api/exercises';
import { me } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DeleteRecordButton } from '../DeleteRecordButton';
import { deleteRecordAction } from '../actions';

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await requireToken();

  const recordResult = await getRecord(token, id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) {
      notFound();
    }
    throw e;
  });

  const [{ user }, exercises] = await Promise.all([
    me(token),
    listExercises(token),
  ]);
  const exerciseName =
    exercises.find((ex) => ex.id === recordResult.exerciseId)?.name ?? '種目';
  const isOwner = recordResult.userId === user.id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{exerciseName}</h1>
        <span className="text-sm text-zinc-500">
          {new Date(recordResult.performedAt).toLocaleDateString('ja-JP')}
        </span>
      </div>
      {!isOwner && (
        <p className="text-xs text-zinc-500">
          {recordResult.user.name}さんの記録
        </p>
      )}
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1 font-normal">セット</th>
              <th className="py-1 font-normal">重量</th>
              <th className="py-1 font-normal">回数</th>
              <th className="py-1 font-normal">速度</th>
            </tr>
          </thead>
          <tbody>
            {recordResult.sets.map((set) => (
              <tr key={set.id}>
                <td className="py-1">{set.order}</td>
                <td className="py-1">{set.weight}kg</td>
                <td className="py-1">{set.reps}回</td>
                <td className="py-1">{set.velocity ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {recordResult.memo && (
        <p className="text-sm text-zinc-600">{recordResult.memo}</p>
      )}

      {isOwner && (
        <div className="flex gap-2">
          <Link href={`/records/${recordResult.id}/edit`} className="flex-1">
            <Button variant="secondary">編集</Button>
          </Link>
          <div className="flex-1">
            <DeleteRecordButton
              action={deleteRecordAction.bind(null, recordResult.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
