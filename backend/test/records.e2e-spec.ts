import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface RecordBody {
  id: string;
  userId: string;
  memo: string | null;
}

/**
 * 実際の Postgres に繋いで HTTP 経由で叩く e2e テスト。
 * docs/api-spec.md 5章「Records」の中心である認可ロジック
 * （所有者/公開先グループのメンバー/無関係の第三者、閲覧可否と変更可否）を検証する。
 */
describe('Records (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const run = Date.now();
  const owner = {
    email: `e2e-records-owner-${run}@example.com`,
    password: 'password123',
    name: 'オーナー',
  };
  const member = {
    email: `e2e-records-member-${run}@example.com`,
    password: 'password123',
    name: 'メンバー',
  };
  const stranger = {
    email: `e2e-records-stranger-${run}@example.com`,
    password: 'password123',
    name: '第三者',
  };
  const groupName = `E2E記録公開先-${run}`;
  const exerciseName = `E2E種目-${run}`;

  let ownerToken: string;
  let memberToken: string;
  let strangerToken: string;
  let groupId: string;
  let exerciseId: string;
  let privateRecordId: string;
  let sharedRecordId: string;

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

  describe('POST /records', () => {
    it('未認証なら401', async () => {
      await request(app.getHttpServer())
        .post('/records')
        .send({
          exerciseId,
          performedAt: '2026-01-01',
          sets: [{ order: 1, weight: 100, reps: 5 }],
        })
        .expect(401);
    });

    it('存在しないexerciseIdなら400', async () => {
      await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId: 'no-such-exercise',
          performedAt: '2026-01-01',
          sets: [{ order: 1, weight: 100, reps: 5 }],
        })
        .expect(400);
    });

    it('setsが空配列なら400', async () => {
      await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ exerciseId, performedAt: '2026-01-01', sets: [] })
        .expect(400);
    });

    it('所属していないグループへの公開指定は400', async () => {
      await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({
          exerciseId,
          performedAt: '2026-01-01',
          sets: [{ order: 1, weight: 100, reps: 5 }],
          visibilityGroupIds: [groupId],
        })
        .expect(400);
    });

    it('公開先を指定しなければ非公開記録として作成できる（201）', async () => {
      const res = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          performedAt: '2026-01-01',
          memo: '非公開',
          sets: [{ order: 1, weight: 100, reps: 5 }],
        })
        .expect(201);
      privateRecordId = (res.body as RecordBody).id;
    });

    it('所属グループへ公開指定した記録を作成できる（201）', async () => {
      const res = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          performedAt: '2026-01-02',
          memo: 'グループ公開',
          sets: [{ order: 1, weight: 110, reps: 3, velocity: 0.5 }],
          visibilityGroupIds: [groupId],
        })
        .expect(201);
      sharedRecordId = (res.body as RecordBody).id;
    });
  });

  describe('GET /records/:id（非公開記録: 存在有無を漏らさない）', () => {
    it('所有者は見られる', async () => {
      await request(app.getHttpServer())
        .get(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('グループメンバーでも非公開記録は404', async () => {
      await request(app.getHttpServer())
        .get(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });

    it('無関係の第三者は404', async () => {
      await request(app.getHttpServer())
        .get(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });
  });

  describe('GET /records/:id（グループ公開記録）', () => {
    it('公開先グループのメンバーは見られる', async () => {
      const res = await request(app.getHttpServer())
        .get(`/records/${sharedRecordId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect((res.body as RecordBody).memo).toBe('グループ公開');
    });

    it('公開先グループに属さない第三者は404', async () => {
      await request(app.getHttpServer())
        .get(`/records/${sharedRecordId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });
  });

  describe('GET /records（自分の記録一覧）', () => {
    it('自分が作成した記録のみが含まれる', async () => {
      const res = await request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([privateRecordId, sharedRecordId]),
      );
    });

    it('他人の記録は含まれない', async () => {
      const res = await request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).not.toContain(privateRecordId);
      expect(ids).not.toContain(sharedRecordId);
    });
  });

  describe('GET /groups/:groupId/records', () => {
    it('メンバーはグループ公開記録のみ見られる（非公開は含まれない）', async () => {
      const res = await request(app.getHttpServer())
        .get(`/groups/${groupId}/records`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const ids = (res.body as RecordBody[]).map((r) => r.id);
      expect(ids).toContain(sharedRecordId);
      expect(ids).not.toContain(privateRecordId);
    });

    it('非会員は404', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${groupId}/records`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });
  });

  describe('PATCH /records/:id（所有者のみ）', () => {
    it('所有者は更新できる', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ memo: '更新後の非公開メモ' })
        .expect(200);
      expect((res.body as RecordBody).memo).toBe('更新後の非公開メモ');
    });

    it('見えているが所有者でない場合は403', async () => {
      await request(app.getHttpServer())
        .patch(`/records/${sharedRecordId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ memo: 'こっそり書き換え' })
        .expect(403);
    });

    it('そもそも見えない場合は404（403にしない）', async () => {
      await request(app.getHttpServer())
        .patch(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ memo: '書き換え' })
        .expect(404);
    });
  });

  describe('DELETE /records/:id（所有者のみ）', () => {
    it('所有者でなければ403', async () => {
      await request(app.getHttpServer())
        .delete(`/records/${sharedRecordId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('所有者は削除でき、以降は404になる', async () => {
      await request(app.getHttpServer())
        .delete(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/records/${privateRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
