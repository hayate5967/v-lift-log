import { Injectable } from '@nestjs/common';
import {
  Record as PrismaRecord,
  RecordVisibility,
  Set as SetModel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RecordWithRelations = PrismaRecord & {
  sets: SetModel[];
  visibility: RecordVisibility[];
  user: { id: string; name: string };
};

interface SetInput {
  order: number;
  weight: number;
  reps: number;
  velocity?: number;
}

interface Pagination {
  limit: number;
  cursor?: string;
}

const includeRelations = {
  sets: { orderBy: { order: 'asc' as const } },
  visibility: true,
  user: { select: { id: true, name: true } },
};

/**
 * Record / Set / RecordVisibility テーブルへのアクセスを集約する Repository 層。
 * 認可判定（誰が見られるか）はここには書かない（Service の責務）。
 */
@Injectable()
export class RecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithSetsAndVisibility(data: {
    userId: string;
    exerciseId: string;
    performedAt: Date;
    memo?: string;
    sets: SetInput[];
    visibilityGroupIds: string[];
  }): Promise<RecordWithRelations> {
    return this.prisma.record.create({
      data: {
        userId: data.userId,
        exerciseId: data.exerciseId,
        performedAt: data.performedAt,
        memo: data.memo,
        sets: { create: data.sets },
        visibility: {
          create: data.visibilityGroupIds.map((groupId) => ({ groupId })),
        },
      },
      include: includeRelations,
    });
  }

  findById(id: string): Promise<RecordWithRelations | null> {
    return this.prisma.record.findUnique({
      where: { id },
      include: includeRelations,
    });
  }

  /**
   * PATCH用。sets/visibilityGroupIdsは「渡されたら全置換、渡されなければ現状維持」。
   * Set/RecordVisibilityの削除→再作成を1トランザクションにまとめる。
   */
  replaceWithSetsAndVisibility(
    id: string,
    data: {
      exerciseId?: string;
      performedAt?: Date;
      memo?: string;
      sets?: SetInput[];
      visibilityGroupIds?: string[];
    },
  ): Promise<RecordWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (data.sets) {
        await tx.set.deleteMany({ where: { recordId: id } });
      }
      if (data.visibilityGroupIds) {
        await tx.recordVisibility.deleteMany({ where: { recordId: id } });
      }
      return tx.record.update({
        where: { id },
        data: {
          exerciseId: data.exerciseId,
          performedAt: data.performedAt,
          memo: data.memo,
          ...(data.sets ? { sets: { create: data.sets } } : {}),
          ...(data.visibilityGroupIds
            ? {
                visibility: {
                  create: data.visibilityGroupIds.map((groupId) => ({
                    groupId,
                  })),
                },
              }
            : {}),
        },
        include: includeRelations,
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.record.delete({ where: { id } });
  }

  findOwnedByUser(
    userId: string,
    pagination: Pagination,
  ): Promise<RecordWithRelations[]> {
    return this.prisma.record.findMany({
      where: { userId },
      include: includeRelations,
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      take: pagination.limit,
      ...(pagination.cursor
        ? { skip: 1, cursor: { id: pagination.cursor } }
        : {}),
    });
  }

  /**
   * 「自分の記録」または「指定グループ群に公開された記録」を新しい順で返す（Feed用）。
   * groupIdFilter指定時は、そのグループに公開された記録のみに絞る（/groups/:id/records用）。
   */
  findVisibleToUser(
    userId: string,
    myGroupIds: string[],
    pagination: Pagination,
    groupIdFilter?: string,
  ): Promise<RecordWithRelations[]> {
    const where = groupIdFilter
      ? { visibility: { some: { groupId: groupIdFilter } } }
      : {
          OR: [
            { userId },
            { visibility: { some: { groupId: { in: myGroupIds } } } },
          ],
        };

    return this.prisma.record.findMany({
      where,
      include: includeRelations,
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      take: pagination.limit,
      ...(pagination.cursor
        ? { skip: 1, cursor: { id: pagination.cursor } }
        : {}),
    });
  }
}
