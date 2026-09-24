import { apiFetch } from './client';
import { StatsMetric, StatsPoint } from './types';

/** GET /stats: 指定種目・指標での自分の記録の推移。 */
export function getStats(
  token: string,
  query: { exerciseId: string; metric: StatsMetric },
): Promise<StatsPoint[]> {
  return apiFetch('/stats', {
    token,
    searchParams: { exerciseId: query.exerciseId, metric: query.metric },
  });
}
