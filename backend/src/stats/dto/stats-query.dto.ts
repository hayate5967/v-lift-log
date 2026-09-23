import { IsIn, IsString } from 'class-validator';

export type StatsMetric = 'maxWeight' | 'est1RM' | 'maxVelocity';

const METRICS: StatsMetric[] = ['maxWeight', 'est1RM', 'maxVelocity'];

/** GET /stats の入力（docs/api-spec.md 6章 Stats）。 */
export class StatsQueryDto {
  @IsString()
  exerciseId: string;

  @IsIn(METRICS)
  metric: StatsMetric;
}
