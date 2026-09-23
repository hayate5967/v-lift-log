import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface GroupBody {
  id: string;
  name: string;
  joinCode: string;
}

/**
 * 実際の Postgres に繋いで HTTP 経由で叩く e2e テスト。
 * docs/api-spec.md 3章「Groups」の各エンドポイントと、
 * 非会員には存在有無を漏らさない（404）という認可方針の境界を検証する。
 */
describe('Groups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const run = Date.now();
  const owner = {
    email: `e2e-groups-owner-${run}@example.com`,
    password: 'password123',
    name: 'オーナー',
  };
  const member = {
    email: `e2e-groups-member-${run}@example.com`,
    password: 'password123',
    name: 'メンバー',
  };
  const stranger = {
    email: `e2e-groups-stranger-${run}@example.com`,
    password: 'password123',
    name: '第三者',
  };

  let ownerToken: string;
  let memberToken: string;
  let strangerToken: string;
  let group: GroupBody;

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
  }, 30000);

  afterAll(async () => {
    const emails = [owner.email, member.email, stranger.email];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const userIds = users.map((u) => u.id);
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.group.deleteMany({ where: { name: `E2Eグループ-${run}` } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('POST /groups', () => {
    it('未認証なら401', async () => {
      await request(app.getHttpServer())
        .post('/groups')
        .send({ name: `E2Eグループ-${run}` })
        .expect(401);
    });

    it('作成に成功すると201でgroupとjoinCodeを返し、作成者は自動的にメンバーになる', async () => {
      const res = await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `E2Eグループ-${run}` })
        .expect(201);

      const body = res.body as { group: GroupBody; joinCode: string };
      expect(body.group.name).toBe(`E2Eグループ-${run}`);
      expect(body.joinCode).toEqual(expect.any(String));
      group = body.group;

      const listRes = await request(app.getHttpServer())
        .get('/groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect((listRes.body as GroupBody[]).map((g) => g.id)).toContain(
        group.id,
      );
    });
  });

  describe('GET /groups/:id（非会員には存在有無を漏らさない）', () => {
    it('非会員がアクセスすると404', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${group.id}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });

    it('存在しないIDでも同じ404', async () => {
      await request(app.getHttpServer())
        .get('/groups/no-such-group-id')
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });

    it('メンバー（作成者）は詳細とメンバー一覧を取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get(`/groups/${group.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        group: GroupBody;
        members: { email: string }[];
      };
      expect(body.group.id).toBe(group.id);
      expect(body.members.map((m) => m.email)).toContain(owner.email);
    });
  });

  describe('POST /groups/join', () => {
    it('参加コードが不正なら404', async () => {
      await request(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ joinCode: 'NOPE0000' })
        .expect(404);
    });

    it('正しい参加コードなら200で参加できる', async () => {
      await request(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ joinCode: group.joinCode })
        .expect(200);

      // 参加後はメンバーとして詳細を取得できる
      await request(app.getHttpServer())
        .get(`/groups/${group.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('二重参加は409', async () => {
      await request(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ joinCode: group.joinCode })
        .expect(409);
    });
  });
});
