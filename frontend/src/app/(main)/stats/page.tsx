import { requireToken } from '@/lib/session';
import { listExercises } from '@/lib/api/exercises';
import { getStats } from '@/lib/api/stats';
import { StatsMetric, StatsPoint } from '@/lib/api/types';
import { StatsFilter } from './StatsFilter';
import { StatsChart } from './StatsChart';

const VALID_METRICS: StatsMetric[] = ['maxWeight', 'est1RM', 'maxVelocity'];

function parseMetric(value: string | undefined): StatsMetric | undefined {
  return VALID_METRICS.includes(value as StatsMetric)
    ? (value as StatsMetric)
    : undefined;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string; metric?: string }>;
}) {
  const { exerciseId, metric: rawMetric } = await searchParams;
  const metric = parseMetric(rawMetric);
  const token = await requireToken();

  const [exercises, points] = await Promise.all([
    listExercises(token),
    exerciseId && metric
      ? getStats(token, { exerciseId, metric })
      : Promise.resolve<StatsPoint[] | null>(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <StatsFilter
        exercises={exercises}
        exerciseId={exerciseId}
        metric={metric}
      />
      {exerciseId && metric && points ? (
        <StatsChart points={points} metric={metric} />
      ) : (
        <p className="text-sm text-zinc-500">種目と指標を選択してください。</p>
      )}
    </div>
  );
}
