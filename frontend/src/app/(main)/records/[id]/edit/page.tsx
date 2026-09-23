import { notFound, redirect } from 'next/navigation';
import { requireToken } from '@/lib/session';
import { getRecord } from '@/lib/api/records';
import { listExercises } from '@/lib/api/exercises';
import { listGroups } from '@/lib/api/groups';
import { me } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { RecordForm } from '../../RecordForm';
import { updateRecordAction } from '../../actions';

export default async function EditRecordPage({
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

  const { user } = await me(token);
  if (recordResult.userId !== user.id) {
    // 閲覧はできても所有者でなければbackendがPATCHを403で弾くため、
    // フォームを見せずに詳細ページへ戻す。
    redirect(`/records/${id}`);
  }

  const [exercises, groups] = await Promise.all([
    listExercises(token),
    listGroups(token),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">記録を編集</h1>
      <RecordForm
        exercises={exercises}
        groups={groups}
        initialValues={{
          exerciseId: recordResult.exerciseId,
          performedAt: recordResult.performedAt.slice(0, 10),
          memo: recordResult.memo ?? '',
          sets: recordResult.sets.map((s) => ({
            order: s.order,
            weight: s.weight,
            reps: s.reps,
            velocity: s.velocity,
          })),
          visibilityGroupIds: recordResult.visibility.map((v) => v.groupId),
        }}
        action={updateRecordAction.bind(null, id)}
        submitLabel="更新する"
      />
    </div>
  );
}
