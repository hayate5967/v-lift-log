import { Test } from '@nestjs/testing';
import { Exercise } from '@prisma/client';
import { ExercisesRepository } from './exercises.repository';
import { ExercisesService } from './exercises.service';

describe('ExercisesService', () => {
  let service: ExercisesService;
  let exercises: {
    findVisibleToUser: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };

  const buildExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
    id: 'exercise-1',
    name: 'ベンチプレス',
    createdByUserId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    exercises = {
      findVisibleToUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: ExercisesRepository, useValue: exercises },
      ],
    }).compile();

    service = moduleRef.get(ExercisesService);
  });

  describe('listForUser', () => {
    it('リポジトリの結果（既定種目+自分のカスタム種目）をそのまま返す', async () => {
      const list = [
        buildExercise(),
        buildExercise({
          id: 'exercise-2',
          name: 'マイ種目',
          createdByUserId: 'user-1',
        }),
      ];
      exercises.findVisibleToUser.mockResolvedValue(list);

      await expect(service.listForUser('user-1')).resolves.toBe(list);
      expect(exercises.findVisibleToUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('create', () => {
    it('作成者のカスタム種目として作成する', async () => {
      const created = buildExercise({
        id: 'exercise-3',
        name: 'マイ種目',
        createdByUserId: 'user-1',
      });
      exercises.create.mockResolvedValue(created);

      await expect(
        service.create('user-1', { name: 'マイ種目' }),
      ).resolves.toEqual(created);
      expect(exercises.create).toHaveBeenCalledWith({
        name: 'マイ種目',
        createdByUserId: 'user-1',
      });
    });
  });
});
