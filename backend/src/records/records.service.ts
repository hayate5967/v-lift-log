import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE_LIMIT,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { ExercisesRepository } from '../exercises/exercises.repository';
import { GroupsRepository } from '../groups/groups.repository';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsRepository, RecordWithRelations } from './records.repository';

interface ResolvedPagination {
  limit: number;
  cursor?: string;
}

@Injectable()
export class RecordsService {
  constructor(
    private readonly records: RecordsRepository,
    private readonly exercises: ExercisesRepository,
    private readonly groups: GroupsRepository,
  ) {}

  /** POST /records */
  async create(
    userId: string,
    dto: CreateRecordDto,
  ): Promise<RecordWithRelations> {
    await this.assertExerciseExists(dto.exerciseId);
    const visibilityGroupIds = dto.visibilityGroupIds ?? [];
    await this.assertMemberOfAll(userId, visibilityGroupIds);

    return this.records.createWithSetsAndVisibility({
      userId,
      exerciseId: dto.exerciseId,
      performedAt: new Date(dto.performedAt),
      memo: dto.memo,
      sets: dto.sets,
      visibilityGroupIds,
    });
  }

  /** GET /records: 自分の記録一覧。 */
  listOwn(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<RecordWithRelations[]> {
    return this.records.findOwnedByUser(
      userId,
      this.resolvePagination(pagination),
    );
  }

  /** GET /records/:id: 閲覧不可・不在はどちらも404（存在有無を漏らさない）。 */
  async getForView(
    userId: string,
    recordId: string,
  ): Promise<RecordWithRelations> {
    const record = await this.records.findById(recordId);
    if (!record || !(await this.canView(userId, record))) {
      throw new NotFoundException('記録が見つかりません');
    }
    return record;
  }

  /** PATCH /records/:id: 所有者のみ。sets/visibilityGroupIdsは渡された分だけ全置換。 */
  async update(
    userId: string,
    recordId: string,
    dto: UpdateRecordDto,
  ): Promise<RecordWithRelations> {
    await this.getForMutation(userId, recordId);

    if (dto.exerciseId) {
      await this.assertExerciseExists(dto.exerciseId);
    }
    if (dto.visibilityGroupIds) {
      await this.assertMemberOfAll(userId, dto.visibilityGroupIds);
    }

    return this.records.replaceWithSetsAndVisibility(recordId, {
      exerciseId: dto.exerciseId,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
      memo: dto.memo,
      sets: dto.sets,
      visibilityGroupIds: dto.visibilityGroupIds,
    });
  }

  /** DELETE /records/:id: 所有者のみ。Set/VisibilityはCascadeで連動削除。 */
  async remove(userId: string, recordId: string): Promise<void> {
    await this.getForMutation(userId, recordId);
    await this.records.delete(recordId);
  }

  /** GET /groups/:groupId/records: そのグループに公開された記録一覧（会員のみ）。 */
  async listByGroup(
    userId: string,
    groupId: string,
    pagination: PaginationQueryDto,
  ): Promise<RecordWithRelations[]> {
    const membership = await this.groups.findMembership(userId, groupId);
    if (!membership) {
      throw new NotFoundException('グループが見つかりません');
    }
    return this.records.findVisibleToUser(
      userId,
      [],
      this.resolvePagination(pagination),
      groupId,
    );
  }

  /**
   * 所有者かつ閲覧可能であることを確認する。所有者でなければ、
   * 閲覧すらできない（＝存在を知らせるべきでない）なら404、
   * 閲覧はできる（例: グループ公開されている）が所有者でないなら403。
   */
  private async getForMutation(
    userId: string,
    recordId: string,
  ): Promise<RecordWithRelations> {
    const record = await this.getForView(userId, recordId);
    if (record.userId !== userId) {
      throw new ForbiddenException('この記録を変更する権限がありません');
    }
    return record;
  }

  private async canView(
    userId: string,
    record: RecordWithRelations,
  ): Promise<boolean> {
    if (record.userId === userId) {
      return true;
    }
    if (record.visibility.length === 0) {
      return false;
    }
    const myGroupIds = await this.groups.findGroupIdsForUser(userId);
    return record.visibility.some((v) => myGroupIds.includes(v.groupId));
  }

  private async assertExerciseExists(exerciseId: string): Promise<void> {
    const exercise = await this.exercises.findById(exerciseId);
    if (!exercise) {
      throw new BadRequestException('指定された種目が見つかりません');
    }
  }

  private async assertMemberOfAll(
    userId: string,
    groupIds: string[],
  ): Promise<void> {
    for (const groupId of groupIds) {
      const membership = await this.groups.findMembership(userId, groupId);
      if (!membership) {
        throw new BadRequestException(
          '公開先に指定されたグループの中に、所属していないものが含まれています',
        );
      }
    }
  }

  private resolvePagination(query: PaginationQueryDto): ResolvedPagination {
    return { limit: query.limit ?? DEFAULT_PAGE_LIMIT, cursor: query.cursor };
  }
}
