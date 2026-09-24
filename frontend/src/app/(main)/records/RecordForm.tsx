'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';
import { Exercise, Group } from '@/lib/api/types';
import type { RecordFormState } from './actions';

interface SetRow {
  weight: string;
  reps: string;
  velocity: string;
}

export interface RecordFormInitialValues {
  exerciseId: string;
  performedAt: string;
  memo: string;
  sets: {
    order: number;
    weight: number;
    reps: number;
    velocity: number | null;
  }[];
  visibilityGroupIds: string[];
}

interface RecordFormProps {
  exercises: Exercise[];
  groups: Group[];
  initialValues?: RecordFormInitialValues;
  action: (
    prevState: RecordFormState,
    formData: FormData,
  ) => Promise<RecordFormState>;
  submitLabel: string;
}

const emptySetRow = (): SetRow => ({
  weight: '',
  reps: '',
  velocity: '',
});

export function RecordForm({
  exercises,
  groups,
  initialValues,
  action,
  submitLabel,
}: RecordFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [sets, setSets] = useState<SetRow[]>(
    initialValues && initialValues.sets.length > 0
      ? // sets はbackendからorder昇順で返る前提(records.repository.tsのincludeRelations)。
        // orderは配列位置から導出するため、ここでは並び替えず順序をそのまま使う。
        initialValues.sets.map((s) => ({
          weight: String(s.weight),
          reps: String(s.reps),
          velocity: s.velocity === null ? '' : String(s.velocity),
        }))
      : [emptySetRow()],
  );

  const addSet = () => {
    setSets((prev) => [...prev, emptySetRow()]);
  };

  const removeSet = (index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSet = (
    index: number,
    field: 'weight' | 'reps' | 'velocity',
    value: string,
  ) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const setsJson = JSON.stringify(
    sets.map((s, i) => ({
      order: i + 1,
      weight: Number(s.weight),
      reps: Number(s.reps),
      velocity: s.velocity === '' ? undefined : Number(s.velocity),
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="setsJson" value={setsJson} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">種目</span>
        <select
          name="exerciseId"
          required
          defaultValue={initialValues?.exerciseId ?? ''}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="" disabled>
            選択してください
          </option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>

      <Input
        label="実施日"
        name="performedAt"
        type="date"
        required
        defaultValue={initialValues?.performedAt}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">セット</span>
        {sets.map((set, index) => (
          <div key={index} className="flex items-end gap-2">
            <span className="w-4 pb-2 text-sm text-zinc-500">{index + 1}</span>
            <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600">
              重量(kg)
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={set.weight}
                onChange={(e) => updateSet(index, 'weight', e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-2 text-base"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600">
              回数
              <input
                type="number"
                min="1"
                required
                value={set.reps}
                onChange={(e) => updateSet(index, 'reps', e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-2 text-base"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600">
              速度(任意)
              <input
                type="number"
                step="0.01"
                min="0"
                value={set.velocity}
                onChange={(e) => updateSet(index, 'velocity', e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-2 text-base"
              />
            </label>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(index)}
                className="pb-2 text-sm text-red-600"
              >
                削除
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSet}
          className="self-start text-sm font-medium text-blue-600"
        >
          + セットを追加
        </button>
      </div>

      <Input
        label="メモ(任意)"
        name="memo"
        type="text"
        maxLength={1000}
        defaultValue={initialValues?.memo}
      />

      {groups.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-zinc-700">
            公開先（チェックを付けなければ自分だけに公開されます）
          </legend>
          {groups.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="visibilityGroupIds"
                value={group.id}
                defaultChecked={initialValues?.visibilityGroupIds.includes(
                  group.id,
                )}
              />
              {group.name}
            </label>
          ))}
        </fieldset>
      )}

      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" disabled={pending}>
        {pending ? '保存中…' : submitLabel}
      </Button>
    </form>
  );
}
