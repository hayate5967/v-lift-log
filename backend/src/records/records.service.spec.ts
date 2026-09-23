import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExercisesRepository } from '../exercises/exercises.repository';
import { GroupsRepository } from '../groups/groups.repository';
import { RecordsRepository, RecordWithRelations } from './records.repository';
import { RecordsService } from './records.service';

describe('RecordsService', () => {
  let service: RecordsService;
  let records: {
    createWithSetsAndVisibility: jest.Mock;
    findById: jest.Mock;
    replaceWithSetsAndVisibility: jest.Mock;
    delete: jest.Mock;
    findOwnedByUser: jest.Mock;
    findVisibleToUser: jest.Mock;
  };
  let exercises: { findVisibleById: jest.Mock };
  let groups: {
    findMembership: jest.Mock;
    findGroupIdsForUser: jest.Mock;
    findMembershipsForUser: jest.Mock;
  };

  const buildRecord = (
    overrides: Partial<RecordWithRelations> = {},
  ): RecordWithRelations => ({
    id: 'record-1',
    userId: 'owner-1',
    exerciseId: 'exercise-1',
    performedAt: new Date('2026-01-01T00:00:00.000Z'),
    memo: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    sets: [
      {
        id: 'set-1',
        recordId: 'record-1',
        order: 1,
        weight: 100,
        reps: 5,
        velocity: null,
      },
    ],
    visibility: [],
    user: { id: 'owner-1', name: 'オーナー' },
    ...overrides,
  });

  beforeEach(async () => {
    records = {
      createWithSetsAndVisibility: jest.fn(),
      findById: jest.fn(),
      replaceWithSetsAndVisibility: jest.fn(),
      delete: jest.fn(),
      findOwnedByUser: jest.fn(),
      findVisibleToUser: jest.fn(),
    };
    exercises = { findVisibleById: jest.fn() };
    groups = {
      findMembership: jest.fn(),
      findGroupIdsForUser: jest.fn(),
      findMembershipsForUser: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordsService,
        { provide: RecordsRepository, useValue: records },
        { provide: ExercisesRepository, useValue: exercises },
        { provide: GroupsRepository, useValue: groups },
      ],
    }).compile();

    service = moduleRef.get(RecordsService);
  });

  const createDto = {
    exerciseId: 'exercise-1',
    performedAt: '2026-01-01',
    sets: [{ order: 1, weight: 100, reps: 5 }],
  };

  describe('create', () => {
    it('存在しない種目なら400', async () => {
      exercises.findVisibleById.mockResolvedValue(null);

      await expect(service.create('owner-1', createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(records.createWithSetsAndVisibility).not.toHaveBeenCalled();
    });

    it('他人の非公開カスタム種目は400（存在確認は可視性込みで行う）', async () => {
      // findVisibleByIdは「自分から見える種目でなければnull」を返す想定のmock。
      // ここではその契約どおりnullを返させ、ServiceがfindByIdではなく
      // findVisibleByIdを（userId付きで）使っていることを検証する。
      exercises.findVisibleById.mockResolvedValue(null);

      await expect(service.create('owner-1', createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(exercises.findVisibleById).toHaveBeenCalledWith(
        'owner-1',
        'exercise-1',
      );
    });

    it('所属していないグループへの公開指定は400', async () => {
      exercises.findVisibleById.mockResolvedValue({ id: 'exercise-1' });
      groups.findMembershipsForUser.mockResolvedValue([]);

      await expect(
        service.create('owner-1', {
          ...createDto,
          visibilityGroupIds: ['group-x'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(records.createWithSetsAndVisibility).not.toHaveBeenCalled();
    });

    it('複数グループ指定時、1つでも未所属があれば400', async () => {
      exercises.findVisibleById.mockResolvedValue({ id: 'exercise-1' });
      // group-aのみ所属、group-bは未所属
      groups.findMembershipsForUser.mockResolvedValue([
        {
          id: 'm1',
          userId: 'owner-1',
          groupId: 'group-a',
          joinedAt: new Date(),
        },
      ]);

      await expect(
        service.create('owner-1', {
          ...createDto,
          visibilityGroupIds: ['group-a', 'group-b'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('公開先グループの所属確認はgroupIdごとのループではなく1クエリで行う（N+1回避）', async () => {
      exercises.findVisibleById.mockResolvedValue({ id: 'exercise-1' });
      groups.findMembershipsForUser.mockResolvedValue([
        {
          id: 'm1',
          userId: 'owner-1',
          groupId: 'group-a',
          joinedAt: new Date(),
        },
        {
          id: 'm2',
          userId: 'owner-1',
          groupId: 'group-b',
          joinedAt: new Date(),
        },
      ]);
      records.createWithSetsAndVisibility.mockResolvedValue(buildRecord());

      await service.create('owner-1', {
        ...createDto,
        visibilityGroupIds: ['group-a', 'group-b'],
      });

      expect(groups.findMembershipsForUser).toHaveBeenCalledTimes(1);
      expect(groups.findMembershipsForUser).toHaveBeenCalledWith('owner-1', [
        'group-a',
        'group-b',
      ]);
      expect(groups.findMembership).not.toHaveBeenCalled();
    });

    it('正常な入力なら作成する', async () => {
      exercises.findVisibleById.mockResolvedValue({ id: 'exercise-1' });
      groups.findMembershipsForUser.mockResolvedValue([
        {
          id: 'm1',
          userId: 'owner-1',
          groupId: 'group-a',
          joinedAt: new Date(),
        },
      ]);
      const created = buildRecord({
        visibility: [{ id: 'v1', recordId: 'record-1', groupId: 'group-a' }],
      });
      records.createWithSetsAndVisibility.mockResolvedValue(created);

      const result = await service.create('owner-1', {
        ...createDto,
        visibilityGroupIds: ['group-a'],
      });

      expect(result).toBe(created);
      expect(records.createWithSetsAndVisibility).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-1',
          exerciseId: 'exercise-1',
          visibilityGroupIds: ['group-a'],
        }),
      );
    });

    it('重複したgroupIdは1つに集約する（一意制約違反による500を防ぐ）', async () => {
      exercises.findVisibleById.mockResolvedValue({ id: 'exercise-1' });
      groups.findMembershipsForUser.mockResolvedValue([
        {
          id: 'm1',
          userId: 'owner-1',
          groupId: 'group-a',
          joinedAt: new Date(),
        },
      ]);
      records.createWithSetsAndVisibility.mockResolvedValue(buildRecord());

      await service.create('owner-1', {
        ...createDto,
        visibilityGroupIds: ['group-a', 'group-a'],
      });

      expect(records.createWithSetsAndVisibility).toHaveBeenCalledWith(
        expect.objectContaining({ visibilityGroupIds: ['group-a'] }),
      );
    });
  });

  describe('getForView（認可の中心）', () => {
    it('記録が存在しなければ404', async () => {
      records.findById.mockResolvedValue(null);

      await expect(
        service.getForView('someone', 'record-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('所有者は非公開記録でも見られる', async () => {
      const record = buildRecord({ userId: 'owner-1', visibility: [] });
      records.findById.mockResolvedValue(record);

      await expect(service.getForView('owner-1', 'record-1')).resolves.toBe(
        record,
      );
      expect(groups.findGroupIdsForUser).not.toHaveBeenCalled();
    });

    it('非公開記録は他人には404（存在を漏らさない）', async () => {
      const record = buildRecord({ userId: 'owner-1', visibility: [] });
      records.findById.mockResolvedValue(record);

      await expect(
        service.getForView('stranger', 'record-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('公開先グループのメンバーは見られる', async () => {
      const record = buildRecord({
        userId: 'owner-1',
        visibility: [{ id: 'v1', recordId: 'record-1', groupId: 'group-a' }],
      });
      records.findById.mockResolvedValue(record);
      groups.findGroupIdsForUser.mockResolvedValue(['group-a']);

      await expect(service.getForView('member', 'record-1')).resolves.toBe(
        record,
      );
    });

    it('公開先グループに属さない第三者は404', async () => {
      const record = buildRecord({
        userId: 'owner-1',
        visibility: [{ id: 'v1', recordId: 'record-1', groupId: 'group-a' }],
      });
      records.findById.mockResolvedValue(record);
      groups.findGroupIdsForUser.mockResolvedValue(['group-b']);

      await expect(
        service.getForView('stranger', 'record-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update / remove（所有者以外は403）', () => {
    it('見えている（グループ公開）が所有者でない場合は更新403', async () => {
      const record = buildRecord({
        userId: 'owner-1',
        visibility: [{ id: 'v1', recordId: 'record-1', groupId: 'group-a' }],
      });
      records.findById.mockResolvedValue(record);
      groups.findGroupIdsForUser.mockResolvedValue(['group-a']);

      await expect(
        service.update('member', 'record-1', { memo: 'こっそり書き換え' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(records.replaceWithSetsAndVisibility).not.toHaveBeenCalled();
    });

    it('見えていない場合は更新404（403にしない）', async () => {
      const record = buildRecord({ userId: 'owner-1', visibility: [] });
      records.findById.mockResolvedValue(record);

      await expect(
        service.update('stranger', 'record-1', { memo: '書き換え' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('所有者は更新できる', async () => {
      const record = buildRecord({ userId: 'owner-1' });
      records.findById.mockResolvedValue(record);
      const updated = buildRecord({ memo: '更新後' });
      records.replaceWithSetsAndVisibility.mockResolvedValue(updated);

      await expect(
        service.update('owner-1', 'record-1', { memo: '更新後' }),
      ).resolves.toBe(updated);
    });

    it('visibilityGroupIdsの重複は1つに集約する（一意制約違反による500を防ぐ）', async () => {
      const record = buildRecord({ userId: 'owner-1' });
      records.findById.mockResolvedValue(record);
      groups.findMembershipsForUser.mockResolvedValue([
        {
          id: 'm1',
          userId: 'owner-1',
          groupId: 'group-a',
          joinedAt: new Date(),
        },
      ]);
      records.replaceWithSetsAndVisibility.mockResolvedValue(buildRecord());

      await service.update('owner-1', 'record-1', {
        visibilityGroupIds: ['group-a', 'group-a'],
      });

      expect(records.replaceWithSetsAndVisibility).toHaveBeenCalledWith(
        'record-1',
        expect.objectContaining({ visibilityGroupIds: ['group-a'] }),
      );
    });

    it('所有者以外は削除403', async () => {
      const record = buildRecord({ userId: 'owner-1', visibility: [] });
      records.findById.mockResolvedValue(record);

      await expect(
        service.remove('owner-1-imposter', 'record-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(records.delete).not.toHaveBeenCalled();
    });

    it('所有者は削除できる', async () => {
      const record = buildRecord({ userId: 'owner-1' });
      records.findById.mockResolvedValue(record);

      await service.remove('owner-1', 'record-1');
      expect(records.delete).toHaveBeenCalledWith('record-1');
    });
  });

  describe('listOwn', () => {
    it('cursor未指定なら検証なしで一覧を取得する', async () => {
      const list = [buildRecord()];
      records.findOwnedByUser.mockResolvedValue(list);

      await expect(service.listOwn('owner-1', {})).resolves.toBe(list);
      expect(records.findById).not.toHaveBeenCalled();
    });

    it('他人の記録idをcursorに指定すると400（ページ位置の推測を防ぐ）', async () => {
      records.findById.mockResolvedValue(
        buildRecord({ id: 'other-record', userId: 'someone-else' }),
      );

      await expect(
        service.listOwn('owner-1', { cursor: 'other-record' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(records.findOwnedByUser).not.toHaveBeenCalled();
    });

    it('存在しないcursorも400', async () => {
      records.findById.mockResolvedValue(null);

      await expect(
        service.listOwn('owner-1', { cursor: 'no-such-record' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('自分の記録idのcursorなら通る', async () => {
      records.findById.mockResolvedValue(
        buildRecord({ id: 'record-1', userId: 'owner-1' }),
      );
      const list = [buildRecord()];
      records.findOwnedByUser.mockResolvedValue(list);

      await expect(
        service.listOwn('owner-1', { cursor: 'record-1' }),
      ).resolves.toBe(list);
    });
  });

  describe('listByGroup', () => {
    it('非会員は404', async () => {
      groups.findMembership.mockResolvedValue(null);

      await expect(
        service.listByGroup('stranger', 'group-a', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(records.findVisibleToUser).not.toHaveBeenCalled();
    });

    it('そのグループに公開されていない記録idをcursorに指定すると400', async () => {
      groups.findMembership.mockResolvedValue({ id: 'membership-1' });
      records.findById.mockResolvedValue(
        buildRecord({
          id: 'other-record',
          visibility: [
            { id: 'v1', recordId: 'other-record', groupId: 'group-other' },
          ],
        }),
      );

      await expect(
        service.listByGroup('member', 'group-a', { cursor: 'other-record' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(records.findVisibleToUser).not.toHaveBeenCalled();
    });

    it('会員なら一覧を取得する', async () => {
      groups.findMembership.mockResolvedValue({ id: 'membership-1' });
      const list = [buildRecord()];
      records.findVisibleToUser.mockResolvedValue(list);

      await expect(service.listByGroup('member', 'group-a', {})).resolves.toBe(
        list,
      );
      expect(records.findVisibleToUser).toHaveBeenCalledWith(
        'member',
        [],
        { limit: 20, cursor: undefined },
        'group-a',
      );
    });
  });
});
