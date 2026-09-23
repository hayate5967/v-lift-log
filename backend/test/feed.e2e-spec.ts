import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface RecordBody {
  id: string;
  performedAt: string;
}

/**
 * 実際の Postgres に繋いで HTTP 経由で叩く e2e テスト。
 * docs/api-spec.md 5章「Feed」が、非公開記録を漏らさずグループ公開記録だけを
 * 所属メンバーに見せることを検証する。
 */
describe('Feed (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const run = Date.now();
  const owner = {
    email: `e2e-feed-owner-${run}@example.com`,
    password: 'password123',
    name: 'オーナー',
  };
  const member = {
    email: `e2e-feed-member-${run}@example.com`,
    password: 'password123',
    name: 'メンバー',
  };
  const stranger = {
    email: `e2e-feed-stranger-${run}@example.com`,
    password: 'password123',
    name: '第三者',
  };
  const groupName = `E2Eフィード公開先-${run}`;
  const exerciseName = `E2Eフィード種目-${run}`;

  let ownerToken: string;
  let memberToken: string;
  let strangerToken: string;
  let groupId: string;
  let exerciseId: string;
  let privateRecordId: string;
  let olderSharedRecordId: string;
  let newerSharedRecordId: string;

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
    memberToken = await registerAndLogin(member);
    strangerToken = await registerAndLogin(stranger);

    const groupRes = await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: groupName });
    const groupBody = groupRes.body as {
      group: { id: string };
      joinCode: string;
    };
    groupId = groupBody.group.id;
    await request(app.getHttpServer())
      .post('/groups/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ joinCode: groupBody.joinCode });

    const exerciseRes = await request(app.getHttpServer())
      .post('/exercises')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: exerciseName });
    exerciseId = (exerciseRes.body as { id: string }).id;

    const createRecord = async (
      token: string,
      performedAt: string,
      visibilityGroupIds?: string[],
    ): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          exerciseId,
          performedAt,
          sets: [{ order: 1, weight: 100, reps: 5 }],
          visibilityGroupIds,
        });
      return (res.body as RecordBody).id;
    };

    privateRecordId = await createRecord(ownerToken, '2026-01-01');
    olderSharedRecordId = await createRecord(ownerToken, '2026-01-02', [
      groupId,
    ]);
    newerSharedRecordId = await createRecord(ownerToken, '2026-01-03', [
      groupId,
    ]);
  }, 30000);

  afterAll(async () => {
    const emails = [owner.email, member.email, stranger.email];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const userIds = users.map((u) => u.id);
    await prisma.record.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.group.deleteMany({ where: { name: groupName } });
    await prisma.exercise.deleteMany({ where: { name: exerciseName } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('GET /feed', () => {
    it('未認証なら401', async () => {
      await request(app.getHttpServer()).get('/feed').expect(401);
    });

    it('所有者は自分の全記録（非公開含む）を新しい順に見られる', async () => {
      const res = await request(app.getHttpServer())
        .get('/feed')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          privateRecordId,
          olderSharedRecordId,
          newerSharedRecordId,
        ]),
      );
      // 新しい順（performedAt desc）
      expect(ids.indexOf(newerSharedRecordId)).toBeLessThan(
        ids.indexOf(olderSharedRecordId),
      );
    });

    it('グループメンバーはグループ公開記録のみ見え、非公開記録は見えない', async () => {
      const res = await request(app.getHttpServer())
        .get('/feed')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([olderSharedRecordId, newerSharedRecordId]),
      );
      expect(ids).not.toContain(privateRecordId);
    });

    it('無関係の第三者にはどちらも見えない', async () => {
      const res = await request(app.getHttpServer())
        .get('/feed')
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).not.toContain(privateRecordId);
      expect(ids).not.toContain(olderSharedRecordId);
      expect(ids).not.toContain(newerSharedRecordId);
    });

    it('閲覧権限の無い記録idをcursorに指定すると400（ページ位置の推測に使えないようにする）', async () => {
      await request(app.getHttpServer())
        .get('/feed')
        .query({ cursor: privateRecordId })
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(400);
    });
  });

  describe('GET /feed?groupId=', () => {
    it('所属グループでの絞り込みはグループ公開記録のみ返す', async () => {
      const res = await request(app.getHttpServer())
        .get('/feed')
        .query({ groupId })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([olderSharedRecordId, newerSharedRecordId]),
      );
      expect(ids).not.toContain(privateRecordId);
    });

    it('所属していないgroupIdを指定すると404', async () => {
      await request(app.getHttpServer())
        .get('/feed')
        .query({ groupId })
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });

    it('そのグループに公開されていない記録idをcursorに指定すると400', async () => {
      // privateRecordIdはこのグループには公開されていない
      await request(app.getHttpServer())
        .get('/feed')
        .query({ groupId, cursor: privateRecordId })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });
  });
});
