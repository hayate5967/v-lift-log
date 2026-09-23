import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// supertest の res.body は any なので、期待する形をここで明示する。
// createdAt は JSON を経由するとISO文字列になる点に注意。
interface PublicUserBody {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * 実際の Postgres に繋いで HTTP 経由で叩く e2e テスト。
 * docs/design.md 5-2「Auth」の3エンドポイントと、未認証(401)・重複(409)・
 * バリデーション(400) の境界を検証する。
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // ローカルの開発用DBを使い回しても衝突しないよう、実行ごとに一意なメールにする
  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'E2Eタロウ';
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // main.ts と同じ ValidationPipe を入れないと、400 の検証ができない
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    // テストが作ったユーザーを残さない
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('登録に成功すると 201 で user と token を返し、passwordHash は含めない', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, name })
        .expect(201);

      const body = res.body as { user: PublicUserBody; token: string };
      expect(body.user).toMatchObject({ email, name });
      expect(body.user.id).toEqual(expect.any(String));
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body.token).toEqual(expect.any(String));
    });

    it('同じメールアドレスの二重登録は 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, name })
        .expect(409);
    });

    it('パスワードが8文字未満なら 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `short-${Date.now()}@example.com`,
          password: 'short',
          name,
        })
        .expect(400);
    });

    it('メールアドレスの形式が不正なら 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password, name })
        .expect(400);
    });

    it('DTO に無いプロパティを混ぜたら 400（whitelist で弾く）', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `extra-${Date.now()}@example.com`,
          password,
          name,
          isAdmin: true,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('正しい資格情報なら 200 で token を返す', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      const body = res.body as { token: string };
      expect(body.token).toEqual(expect.any(String));
      token = body.token;
    });

    it('パスワードが違えば 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });

    it('存在しないメールアドレスでも 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('トークンが無ければ 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('壊れたトークンなら 401', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.valid.token')
        .expect(401);
    });

    it('正しいトークンなら 200 で本人を返す', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as { user: PublicUserBody };
      expect(body.user).toMatchObject({ email, name });
      expect(body.user).not.toHaveProperty('passwordHash');
    });
  });
});
