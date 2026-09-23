import { Injectable } from '@nestjs/common';
import { Exercise } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Exercise テーブルへのアクセスを集約する Repository 層。
 * 認可判定やビジネスロジックはここには書かない（Service の責務）。
 */
@Injectable()
export class ExercisesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 既定種目（createdByUserId=null）+ 自分のカスタム種目。 */
  findVisibleToUser(userId: string): Promise<Exercise[]> {
    return this.prisma.exercise.findMany({
      where: { OR: [{ createdByUserId: null }, { createdByUserId: userId }] },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({ where: { id } });
  }

  /**
   * Recordsが種目の存在確認に使う。既定種目 or 自分のカスタム種目でなければnull。
   * findByIdだと他人の非公開カスタム種目まで「存在する」扱いになってしまうため、
   * findVisibleToUserと同じ可視性条件で絞り込む。
   */
  findVisibleById(userId: string, id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findFirst({
      where: {
        id,
        OR: [{ createdByUserId: null }, { createdByUserId: userId }],
      },
    });
  }

  create(data: { name: string; createdByUserId: string }): Promise<Exercise> {
    return this.prisma.exercise.create({ data });
  }
}
