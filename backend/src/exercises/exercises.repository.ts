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

  /** Recordsが種目の存在確認に使う。 */
  findById(id: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({ where: { id } });
  }

  create(data: { name: string; createdByUserId: string }): Promise<Exercise> {
    return this.prisma.exercise.create({ data });
  }
}
