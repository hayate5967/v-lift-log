import { Injectable } from '@nestjs/common';
import { StatsMetric, StatsQueryDto } from './dto/stats-query.dto';
import { RecordWithSetsForStats, StatsRepository } from './stats.repository';

export interface StatsPoint {
  performedAt: Date;
  value: number;
}

interface SetForStats {
  weight: number;
  reps: number;
  velocity: number | null;
}

@Injectable()
export class StatsService {
  constructor(private readonly stats: StatsRepository) {}

  /** GET /stats: 指定種目・指標での自分の記録の推移。 */
  async getStats(userId: string, query: StatsQueryDto): Promise<StatsPoint[]> {
    const records = await this.stats.findRecordsForStats(
      userId,
      query.exerciseId,
    );

    return records
      .map((record) => this.toPoint(record, query.metric))
      .filter((point): point is StatsPoint => point !== null);
  }

  /** 1つのRecordを1点に集約する。対象値が1つも無ければnull（=シリーズから除外）。 */
  private toPoint(
    record: RecordWithSetsForStats,
    metric: StatsMetric,
  ): StatsPoint | null {
    const values = record.sets
      .map((set) => this.computeSetValue(set, metric))
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return null;
    }

    return { performedAt: record.performedAt, value: Math.max(...values) };
  }

  private computeSetValue(
    set: SetForStats,
    metric: StatsMetric,
  ): number | null {
    switch (metric) {
      case 'maxWeight':
        return set.weight;
      case 'est1RM':
        // Epley式: 1RM ≈ weight * (1 + reps/30)
        return set.weight * (1 + set.reps / 30);
      case 'maxVelocity':
        return set.velocity;
    }
  }
}
