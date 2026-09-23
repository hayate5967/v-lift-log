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
    await this.assertExerciseExists(userId, dto.exerciseId);
    // 重複したgroupIdをそのままRecordVisibilityの作成に渡すと
    // @@unique([recordId, groupId])制約違反で未処理の500になるため、ここで重複を除去する。
    const visibilityGroupIds = [...new Set(dto.visibilityGroupIds ?? [])];
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
  async listOwn(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<RecordWithRelations[]> {
    await this.assertCursorAccessible(
      pagination.cursor,
      (record) => record.userId === userId,
    );
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
      await this.assertExerciseExists(userId, dto.exerciseId);
    }
    // 重複したgroupIdによるRecordVisibilityの一意制約違反(500)を防ぐため、
    // 渡された場合のみ重複を除去する（未指定=現状維持とは区別する）。
    const visibilityGroupIds = dto.visibilityGroupIds
      ? [...new Set(dto.visibilityGroupIds)]
      : undefined;
    if (visibilityGroupIds) {
      await this.assertMemberOfAll(userId, visibilityGroupIds);
    }

    return this.records.replaceWithSetsAndVisibility(recordId, {
      exerciseId: dto.exerciseId,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
      memo: dto.memo,
      sets: dto.sets,
      visibilityGroupIds,
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
    await this.assertCursorAccessible(pagination.cursor, (record) =>
      record.visibility.some((v) => v.groupId === groupId),
    );
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

  /**
   * 既定種目 or 自分のカスタム種目でなければ400にする。
   * findByIdではなくfindVisibleByIdを使う（他人の非公開カスタム種目を弾くため）。
   */
  private async assertExerciseExists(
    userId: string,
    exerciseId: string,
  ): Promise<void> {
    const exercise = await this.exercises.findVisibleById(userId, exerciseId);
    if (!exercise) {
      throw new BadRequestException('指定された種目が見つかりません');
    }
  }

  /** groupIdごとにfindMembershipをループ呼びするとN+1になるため、1クエリでまとめて確認する。 */
  private async assertMemberOfAll(
    userId: string,
    groupIds: string[],
  ): Promise<void> {
    if (groupIds.length === 0) {
      return;
    }
    const memberships = await this.groups.findMembershipsForUser(
      userId,
      groupIds,
    );
    const memberGroupIds = new Set(memberships.map((m) => m.groupId));
    const hasUnauthorizedGroup = groupIds.some(
      (groupId) => !memberGroupIds.has(groupId),
    );
    if (hasUnauthorizedGroup) {
      throw new BadRequestException(
        '公開先に指定されたグループの中に、所属していないものが含まれています',
      );
    }
  }

  /**
   * ページングのcursorに、閲覧権限の無い（他人の）記録idが渡された場合に400にする。
   * 未検証のcursorをそのままPrismaのcursorページネーションに渡すと、
   * cursor行の並び替え用の値（performedAt等）が閲覧権限を無視して参照されてしまい、
   * 権限の無い記録の存在やおおよその日付を推測できてしまうため。
   */
  private async assertCursorAccessible(
    cursor: string | undefined,
    isAccessible: (record: RecordWithRelations) => boolean,
  ): Promise<void> {
    if (!cursor) {
      return;
    }
    const record = await this.records.findById(cursor);
    if (!record || !isAccessible(record)) {
      throw new BadRequestException('cursorが不正です');
    }
  }

  private resolvePagination(query: PaginationQueryDto): ResolvedPagination {
    return { limit: query.limit ?? DEFAULT_PAGE_LIMIT, cursor: query.cursor };
  }
}
