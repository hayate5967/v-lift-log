import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Group } from '@prisma/client';
import { randomInt } from 'crypto';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupMember, GroupsRepository } from './groups.repository';

const JOIN_CODE_LENGTH = 8;
// 紛らわしい文字（0/O, 1/I）を除いた文字集合。手入力で参加する想定のため。
const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const JOIN_CODE_MAX_ATTEMPTS = 5;

@Injectable()
export class GroupsService {
  constructor(private readonly groups: GroupsRepository) {}

  /** POST /groups: グループ作成し、作成者を自動的にメンバー化する。 */
  async create(
    userId: string,
    dto: CreateGroupDto,
  ): Promise<{ group: Group; joinCode: string }> {
    for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
      const joinCode = this.generateJoinCode();
      const existing = await this.groups.findByJoinCode(joinCode);
      if (existing) {
        continue;
      }
      const group = await this.groups.createGroupWithCreatorMembership(
        dto.name,
        joinCode,
        userId,
      );
      return { group, joinCode: group.joinCode };
    }
    // 33^8通りの空間で5回連続衝突する確率は実質ゼロだが、無限ループにはしない。
    throw new ConflictException(
      '参加コードの生成に失敗しました。もう一度お試しください',
    );
  }

  /** GET /groups: 自分の所属グループ一覧。 */
  listForUser(userId: string): Promise<Group[]> {
    return this.groups.findGroupsForUser(userId);
  }

  /** GET /groups/:id: 詳細+メンバー一覧。非会員には存在有無を漏らさず404。 */
  async getDetail(
    userId: string,
    groupId: string,
  ): Promise<{ group: Group; members: GroupMember[] }> {
    const group = await this.getMemberGroupOrThrow(userId, groupId);
    const members = await this.groups.findMembersOfGroup(groupId);
    return { group, members };
  }

  /** POST /groups/join: 参加コードでグループに参加する。 */
  async join(userId: string, dto: JoinGroupDto): Promise<{ group: Group }> {
    const group = await this.groups.findByJoinCode(dto.joinCode);
    if (!group) {
      throw new NotFoundException('参加コードが正しくありません');
    }

    const existing = await this.groups.findMembership(userId, group.id);
    if (existing) {
      throw new ConflictException('既にこのグループに参加しています');
    }

    await this.groups.createMembership(userId, group.id);
    return { group };
  }

  /**
   * グループが存在しない場合も、存在するが非会員の場合も同じ404にする
   * （非会員にグループの存在有無を漏らさないため。AGENTS.mdのセキュリティ方針）。
   */
  private async getMemberGroupOrThrow(
    userId: string,
    groupId: string,
  ): Promise<Group> {
    const group = await this.groups.findById(groupId);
    if (!group) {
      throw new NotFoundException('グループが見つかりません');
    }

    const membership = await this.groups.findMembership(userId, groupId);
    if (!membership) {
      throw new NotFoundException('グループが見つかりません');
    }

    return group;
  }

  private generateJoinCode(): string {
    let code = '';
    for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
      code += JOIN_CODE_CHARS[randomInt(JOIN_CODE_CHARS.length)];
    }
    return code;
  }
}
