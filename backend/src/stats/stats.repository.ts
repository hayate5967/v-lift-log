import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordWithSetsForStats {
  performedAt: Date;
  sets: { weight: number; reps: number; velocity: number | null }[];
}

/**
 * 統計集計専用の読み取り。呼び出しユーザー自身のRecord+Setのみを対象にする
 * （常にuserIdで絞るため、他人のデータが混入しない）。
 */
@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRecordsForStats(
    userId: string,
    exerciseId: string,
  ): Promise<RecordWithSetsForStats[]> {
    return this.prisma.record.findMany({
      where: { userId, exerciseId },
      select: {
        performedAt: true,
        sets: { select: { weight: true, reps: true, velocity: true } },
      },
      orderBy: { performedAt: 'asc' },
    });
  }
}
