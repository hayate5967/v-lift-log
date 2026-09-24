import { requireToken } from '@/lib/session';
import { listExercises } from '@/lib/api/exercises';
import { listGroups } from '@/lib/api/groups';
import { RecordForm } from '../RecordForm';
import { createRecordAction } from '../actions';

export default async function NewRecordPage() {
  const token = await requireToken();
  const [exercises, groups] = await Promise.all([
    listExercises(token),
    listGroups(token),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">記録を追加</h1>
      <RecordForm
        exercises={exercises}
        groups={groups}
        action={createRecordAction}
        submitLabel="保存する"
      />
    </div>
  );
}
