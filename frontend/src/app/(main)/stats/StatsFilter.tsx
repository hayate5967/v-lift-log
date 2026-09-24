'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/stats?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <select
        value={exerciseId ?? ''}
        onChange={(e) => updateParam('exerciseId', e.target.value)}
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
