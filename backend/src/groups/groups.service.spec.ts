import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Group, Membership } from '@prisma/client';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let groups: {
    createGroupWithCreatorMembership: jest.Mock;
    findById: jest.Mock;
    findByJoinCode: jest.Mock;
    findMembership: jest.Mock;
    createMembership: jest.Mock;
    findGroupsForUser: jest.Mock;
    findGroupIdsForUser: jest.Mock;
    findMembersOfGroup: jest.Mock;
  };

  const buildGroup = (overrides: Partial<Group> = {}): Group => ({
    id: 'group-1',
    name: 'ベンチプレス部',
    joinCode: 'ABCD1234',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const buildMembership = (
    overrides: Partial<Membership> = {},
  ): Membership => ({
    id: 'membership-1',
    userId: 'user-1',
    groupId: 'group-1',
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    groups = {
      createGroupWithCreatorMembership: jest.fn(),
      findById: jest.fn(),
      findByJoinCode: jest.fn(),
      findMembership: jest.fn(),
      createMembership: jest.fn(),
      findGroupsForUser: jest.fn(),
      findGroupIdsForUser: jest.fn(),
      findMembersOfGroup: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: GroupsRepository, useValue: groups },
      ],
    }).compile();

    service = moduleRef.get(GroupsService);
  });

  describe('create', () => {
    it('参加コードが衝突しなければ1回でグループを作成する', async () => {
      groups.findByJoinCode.mockResolvedValue(null);
      const group = buildGroup();
      groups.createGroupWithCreatorMembership.mockResolvedValue(group);

      const result = await service.create('user-1', { name: 'ベンチプレス部' });

      expect(groups.findByJoinCode).toHaveBeenCalledTimes(1);
      expect(groups.createGroupWithCreatorMembership).toHaveBeenCalledWith(
        'ベンチプレス部',
        expect.stringMatching(/^[A-Z0-9]{8}$/),
        'user-1',
      );
      expect(result).toEqual({ group, joinCode: group.joinCode });
    });

    it('参加コードが衝突したら別のコードで再試行する', async () => {
      groups.findByJoinCode
        .mockResolvedValueOnce(buildGroup()) // 1回目: 衝突
        .mockResolvedValueOnce(null); // 2回目: 空き
      const group = buildGroup({ joinCode: 'WXYZ9876' });
      groups.createGroupWithCreatorMembership.mockResolvedValue(group);

      await service.create('user-1', { name: 'ベンチプレス部' });

      expect(groups.findByJoinCode).toHaveBeenCalledTimes(2);
      expect(groups.createGroupWithCreatorMembership).toHaveBeenCalledTimes(1);
    });

    it('5回連続で衝突したら ConflictException を投げる', async () => {
      groups.findByJoinCode.mockResolvedValue(buildGroup());

      await expect(
        service.create('user-1', { name: 'ベンチプレス部' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(groups.createGroupWithCreatorMembership).not.toHaveBeenCalled();
    });
  });

  describe('listForUser', () => {
    it('リポジトリの結果をそのまま返す', async () => {
      const list = [buildGroup()];
      groups.findGroupsForUser.mockResolvedValue(list);

      await expect(service.listForUser('user-1')).resolves.toBe(list);
      expect(groups.findGroupsForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getDetail', () => {
    it('存在しないグループなら404', async () => {
      groups.findById.mockResolvedValue(null);

      await expect(
        service.getDetail('user-1', 'no-such-group'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(groups.findMembership).not.toHaveBeenCalled();
    });

    it('存在はするが非会員なら404（存在有無を漏らさない）', async () => {
      groups.findById.mockResolvedValue(buildGroup());
      groups.findMembership.mockResolvedValue(null);

      const notFoundGroupError = await service
        .getDetail('user-1', 'no-such-group')
        .catch((e: Error) => e);
      groups.findById.mockResolvedValue(null);
      const notMemberError = await service
        .getDetail('user-1', 'group-1')
        .catch((e: Error) => e);

      expect(notFoundGroupError).toBeInstanceOf(NotFoundException);
      expect(notMemberError).toBeInstanceOf(NotFoundException);
      expect((notFoundGroupError as Error).message).toBe(
        (notMemberError as Error).message,
      );
    });

    it('メンバーならグループ詳細とメンバー一覧を返す', async () => {
      const group = buildGroup();
      const members = [
        {
          id: 'user-1',
          name: 'タロウ',
          email: 't@example.com',
          joinedAt: new Date(),
        },
      ];
      groups.findById.mockResolvedValue(group);
      groups.findMembership.mockResolvedValue(buildMembership());
      groups.findMembersOfGroup.mockResolvedValue(members);

      await expect(service.getDetail('user-1', 'group-1')).resolves.toEqual({
        group,
        members,
      });
    });
  });

  describe('join', () => {
    it('参加コードが不正なら404', async () => {
      groups.findByJoinCode.mockResolvedValue(null);

      await expect(
        service.join('user-1', { joinCode: 'NOPE0000' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(groups.createMembership).not.toHaveBeenCalled();
    });

    it('既に参加済みなら409', async () => {
      groups.findByJoinCode.mockResolvedValue(buildGroup());
      groups.findMembership.mockResolvedValue(buildMembership());

      await expect(
        service.join('user-1', { joinCode: 'ABCD1234' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(groups.createMembership).not.toHaveBeenCalled();
    });

    it('未参加なら参加してグループを返す', async () => {
      const group = buildGroup();
      groups.findByJoinCode.mockResolvedValue(group);
      groups.findMembership.mockResolvedValue(null);
      groups.createMembership.mockResolvedValue(buildMembership());

      await expect(
        service.join('user-1', { joinCode: 'ABCD1234' }),
      ).resolves.toEqual({ group });
      expect(groups.createMembership).toHaveBeenCalledWith('user-1', 'group-1');
    });
  });
});
