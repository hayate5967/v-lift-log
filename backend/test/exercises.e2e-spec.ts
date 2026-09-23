import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface ExerciseBody {
  id: string;
  name: string;
  createdByUserId: string | null;
}

/**
 * 実際の Postgres に繋いで HTTP 経由で叩く e2e テスト。
 * docs/api-spec.md 4章「Exercises」のエンドポイントと、
 * カスタム種目が他人には見えないことを検証する。
 */
describe('Exercises (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const run = Date.now();
  const owner = {
    email: `e2e-exercises-owner-${run}@example.com`,
    password: 'password123',
    name: 'オーナー',
  };
  const other = {
    email: `e2e-exercises-other-${run}@example.com`,
    password: 'password123',
    name: '他人',
  };
  const customName = `E2Eマイ種目-${run}`;

  let ownerToken: string;
  let otherToken: string;

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
    otherToken = await registerAndLogin(other);
  }, 30000);

  afterAll(async () => {
    const emails = [owner.email, other.email];
    await prisma.exercise.deleteMany({ where: { name: customName } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('POST /exercises', () => {
    it('未認証なら401', async () => {
      await request(app.getHttpServer())
        .post('/exercises')
        .send({ name: customName })
        .expect(401);
    });

    it('作成に成功すると201で自分のカスタム種目として返す', async () => {
      const res = await request(app.getHttpServer())
        .post('/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: customName })
        .expect(201);

      const body = res.body as ExerciseBody;
      expect(body.name).toBe(customName);
      expect(body.createdByUserId).toEqual(expect.any(String));
    });

    it('空文字の名前は400', async () => {
      await request(app.getHttpServer())
        .post('/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('GET /exercises', () => {
    it('未認証なら401', async () => {
      await request(app.getHttpServer()).get('/exercises').expect(401);
    });

    it('作成者には自分のカスタム種目が見える', async () => {
      const res = await request(app.getHttpServer())
        .get('/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect((res.body as ExerciseBody[]).map((e) => e.name)).toContain(
        customName,
      );
    });

    it('他人には見えない（既定種目のみ）', async () => {
      const res = await request(app.getHttpServer())
        .get('/exercises')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect((res.body as ExerciseBody[]).map((e) => e.name)).not.toContain(
        customName,
      );
    });
  });
});
