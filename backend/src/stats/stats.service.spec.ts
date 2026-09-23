import { Test } from '@nestjs/testing';
import { RecordWithSetsForStats, StatsRepository } from './stats.repository';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let stats: { findRecordsForStats: jest.Mock };

  beforeEach(async () => {
    stats = { findRecordsForStats: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [StatsService, { provide: StatsRepository, useValue: stats }],
    }).compile();

    service = moduleRef.get(StatsService);
  });

  it('記録が無ければ空配列', async () => {
    stats.findRecordsForStats.mockResolvedValue([]);

    await expect(
      service.getStats('user-1', {
        exerciseId: 'exercise-1',
        metric: 'maxWeight',
      }),
    ).resolves.toEqual([]);
  });

  it('maxWeight: Recordごとにsets中の最大重量を返す', async () => {
    const records: RecordWithSetsForStats[] = [
      {
        performedAt: new Date('2026-01-01'),
        sets: [
          { weight: 100, reps: 5, velocity: null },
          { weight: 110, reps: 3, velocity: null },
        ],
      },
    ];
    stats.findRecordsForStats.mockResolvedValue(records);

    await expect(
      service.getStats('user-1', {
        exerciseId: 'exercise-1',
        metric: 'maxWeight',
      }),
    ).resolves.toEqual([{ performedAt: records[0].performedAt, value: 110 }]);
  });

  it('est1RM: Epley式（weight*(1+reps/30)）の最大値を返す', async () => {
    const records: RecordWithSetsForStats[] = [
      {
        performedAt: new Date('2026-01-01'),
        sets: [{ weight: 100, reps: 5, velocity: null }],
      },
    ];
    stats.findRecordsForStats.mockResolvedValue(records);

    const result = await service.getStats('user-1', {
      exerciseId: 'exercise-1',
      metric: 'est1RM',
    });

    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(100 * (1 + 5 / 30));
  });

  it('maxVelocity: velocityがnullのsetは無視し、無ければそのRecordを除外する', async () => {
    const records: RecordWithSetsForStats[] = [
      {
        performedAt: new Date('2026-01-01'),
        sets: [
          { weight: 100, reps: 5, velocity: 0.4 },
          { weight: 100, reps: 5, velocity: null },
        ],
      },
      {
        performedAt: new Date('2026-01-02'),
        sets: [{ weight: 100, reps: 5, velocity: null }],
      },
    ];
    stats.findRecordsForStats.mockResolvedValue(records);

    const result = await service.getStats('user-1', {
      exerciseId: 'exercise-1',
      metric: 'maxVelocity',
    });

    expect(result).toEqual([
      { performedAt: records[0].performedAt, value: 0.4 },
    ]);
  });
});
