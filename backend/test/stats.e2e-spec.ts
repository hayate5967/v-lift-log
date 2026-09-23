import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface StatsPointBody {
  performedAt: string;
  value: number;
}

/**
 * 実際の Postgres に繋いで HTTP 経由で叩く e2e テスト。
 * docs/api-spec.md 6章「Stats」が常に呼び出しユーザー自身のデータのみを対象にすることを検証する。
 */
describe('Stats (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const run = Date.now();
  const owner = {
    email: `e2e-stats-owner-${run}@example.com`,
    password: 'password123',
    name: 'オーナー',
  };
  const stranger = {
    email: `e2e-stats-stranger-${run}@example.com`,
    password: 'password123',
    name: '第三者',
  };
  const exerciseName = `E2E統計種目-${run}`;

  let ownerToken: string;
  let strangerToken: string;
  let exerciseId: string;

  const registerAndLogin = async (user: {
    email: string;
    password: string;
    name: string;
  }): Promise<string> => {
    await request(app.getHttpServer()).post('/auth/register').send(user);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password });
    return (res.body as { token: string }).token;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    ownerToken = await registerAndLogin(owner);
    strangerToken = await registerAndLogin(stranger);

    const exerciseRes = await request(app.getHttpServer())
      .post('/exercises')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: exerciseName });
    exerciseId = (exerciseRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        exerciseId,
        performedAt: '2026-01-01',
        sets: [
          { order: 1, weight: 100, reps: 5, velocity: 0.4 },
          { order: 2, weight: 105, reps: 3 },
        ],
      });
    await request(app.getHttpServer())
      .post('/records')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        exerciseId,
        performedAt: '2026-01-08',
        sets: [{ order: 1, weight: 110, reps: 2 }],
      });
  }, 30000);

  afterAll(async () => {
    const emails = [owner.email, stranger.email];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const userIds = users.map((u) => u.id);
    await prisma.record.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.exercise.deleteMany({ where: { name: exerciseName } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('GET /stats', () => {
    it('未認証なら401', async () => {
      await request(app.getHttpServer())
        .get('/stats')
        .query({ exerciseId, metric: 'maxWeight' })
        .expect(401);
    });

    it('metricが不正なら400', async () => {
      await request(app.getHttpServer())
        .get('/stats')
        .query({ exerciseId, metric: 'invalid' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('exerciseId未指定なら400', async () => {
      await request(app.getHttpServer())
        .get('/stats')
        .query({ metric: 'maxWeight' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('maxWeight: 日付昇順でRecordごとの最大重量を返す', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats')
        .query({ exerciseId, metric: 'maxWeight' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as StatsPointBody[];
      expect(body).toHaveLength(2);
      expect(body[0].value).toBe(105);
      expect(body[1].value).toBe(110);
      expect(new Date(body[0].performedAt).getTime()).toBeLessThan(
        new Date(body[1].performedAt).getTime(),
      );
    });

    it('maxVelocity: velocityがあるsetを含むRecordのみ返す', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats')
        .query({ exerciseId, metric: 'maxVelocity' })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as StatsPointBody[];
      expect(body).toHaveLength(1);
      expect(body[0].value).toBe(0.4);
    });

    it('他人のデータは対象にならない', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats')
        .query({ exerciseId, metric: 'maxWeight' })
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(200);

      expect(res.body as StatsPointBody[]).toEqual([]);
    });
  });
});
