import { Injectable } from '@nestjs/common';
import { Group, Membership } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
}

/**
 * Group / Membership テーブルへのアクセスを集約する Repository 層。
 * 認可判定やビジネスロジックはここには書かない（Service の責務）。
 */
@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** グループ作成と、作成者の自動参加を1トランザクションで行う。 */
  createGroupWithCreatorMembership(
    name: string,
    joinCode: string,
    creatorUserId: string,
  ): Promise<Group> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({ data: { name, joinCode } });
      await tx.membership.create({
        data: { userId: creatorUserId, groupId: group.id },
      });
      return group;
    });
  }

  findById(id: string): Promise<Group | null> {
    return this.prisma.group.findUnique({ where: { id } });
  }

  findByJoinCode(joinCode: string): Promise<Group | null> {
    return this.prisma.group.findUnique({ where: { joinCode } });
  }

  findMembership(userId: string, groupId: string): Promise<Membership | null> {
    return this.prisma.membership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
  }

  createMembership(userId: string, groupId: string): Promise<Membership> {
    return this.prisma.membership.create({ data: { userId, groupId } });
  }

  /** 自分の所属グループ一覧（GET /groups）。 */
  async findGroupsForUser(userId: string): Promise<Group[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { group: true },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => m.group);
  }

  /** 自分の所属グループIDのみ（Records/Feedの認可判定用）。 */
  async findGroupIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { groupId: true },
    });
    return memberships.map((m) => m.groupId);
  }

  /**
   * 複数グループへの所属を1クエリでまとめて確認する（Recordsの公開先検証用）。
   * groupIdごとにfindMembershipをループで呼ぶとN+1になるため、これで集約する。
   */
  findMembershipsForUser(
    userId: string,
    groupIds: string[],
  ): Promise<Membership[]> {
    return this.prisma.membership.findMany({
      where: { userId, groupId: { in: groupIds } },
    });
  }

  async findMembersOfGroup(groupId: string): Promise<GroupMember[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { groupId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      joinedAt: m.joinedAt,
    }));
  }
}
