'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Exercise, StatsMetric } from '@/lib/api/types';

const METRICS: { value: StatsMetric; label: string }[] = [
  { value: 'maxWeight', label: '最大重量' },
  { value: 'est1RM', label: '推定1RM' },
  { value: 'maxVelocity', label: '最大速度' },
];

export function StatsFilter({
  exercises,
  exerciseId,
  metric,
}: {
  exercises: Exercise[];
  exerciseId?: string;
  metric?: StatsMetric;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateParam = (key: string, value: string) => {
    // useSearchParams()の値はこのコンポーネントが再レンダリングされるまで
    // 更新されないため、2つのselectを間を置かず操作すると片方のパラメータが
    // 失われるレースになる。window.location.searchから都度読むことで、
    // 直前のrouter.push()（historyのURL自体は同期的に更新される）を
    // 確実に反映させる。
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/stats?${params.toString()}`);
    });
  };

  return (
    <div className="flex gap-2">
      <select
        value={exerciseId ?? ''}
        onChange={(e) => updateParam('exerciseId', e.target.value)}
        disabled={isPending}
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">種目を選択</option>
        {exercises.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name}
          </option>
        ))}
      </select>
      <select
        value={metric ?? ''}
        onChange={(e) => updateParam('metric', e.target.value)}
        disabled={isPending}
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">指標を選択</option>
        {METRICS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
