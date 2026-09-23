import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

/**
 * Service 単体テスト。DB と JWT の署名はモックに差し替え、
 * 「ハッシュ化しているか」「失敗時に正しい例外を投げるか」といった
 * AuthService 自身の責務だけを検証する。
 */
describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'taro@example.com',
    passwordHash: 'dummy-hash',
    name: 'タロウ',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: users },
        { provide: JwtService, useValue: { sign: () => 'signed-token' } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'taro@example.com',
      password: 'password123',
      name: 'タロウ',
    };

    it('パスワードを平文ではなくハッシュで保存する', async () => {
      let savedPasswordHash = '';
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation((data: { passwordHash: string }) => {
        savedPasswordHash = data.passwordHash;
        return Promise.resolve(buildUser({ passwordHash: data.passwordHash }));
      });

      await service.register(dto);

      expect(savedPasswordHash).not.toBe(dto.password);
      // ハッシュは復号できないので、「同じ手順で照合できるか」で正しさを確認する
      await expect(
        bcrypt.compare(dto.password, savedPasswordHash),
      ).resolves.toBe(true);
    });

    it('レスポンスに passwordHash を含めない', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(buildUser());

      const result = await service.register(dto);

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'taro@example.com',
        name: 'タロウ',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.token).toBe('signed-token');
    });

    it('登録済みのメールアドレスなら 409 を投げ、ユーザーを作らない', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('パスワードが一致すればトークンを返す', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      users.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        service.login({ email: 'taro@example.com', password: 'password123' }),
      ).resolves.toEqual({ token: 'signed-token' });
    });

    it('パスワードが違えば 401 を投げる', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      users.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        service.login({
          email: 'taro@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('存在しないメールでも、パスワード誤りと同じメッセージの 401 を返す', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      // login が投げた例外だけを取り出す。成功してしまった場合は
      // UnauthorizedException 以外が返るので、下の assertion で落ちる。
      const captureLoginError = async (
        email: string,
        password: string,
      ): Promise<Error> => {
        try {
          await service.login({ email, password });
          return new Error('ログインが失敗するはずが成功した');
        } catch (e) {
          return e as Error;
        }
      };

      users.findByEmail.mockResolvedValue(buildUser({ passwordHash }));
      const wrongPassword = await captureLoginError(
        'taro@example.com',
        'wrong-password',
      );

      users.findByEmail.mockResolvedValue(null);
      const unknownEmail = await captureLoginError(
        'unknown@example.com',
        'password123',
      );

      // メッセージが違うと、どのメールが登録済みかを外部から特定できてしまう
      expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
      expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
      expect(unknownEmail.message).toBe(wrongPassword.message);
    });
  });

  describe('validateJwtPayload', () => {
    it('DB に存在すれば PublicUser を返す', async () => {
      users.findById.mockResolvedValue(buildUser());

      await expect(
        service.validateJwtPayload({
          sub: 'user-1',
          email: 'taro@example.com',
        }),
      ).resolves.toEqual({
        id: 'user-1',
        email: 'taro@example.com',
        name: 'タロウ',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('署名が正しくても DB に居なければ 401（退会済みのトークンを弾く）', async () => {
      users.findById.mockResolvedValue(null);

      await expect(
        service.validateJwtPayload({
          sub: 'deleted-user',
          email: 'taro@example.com',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
