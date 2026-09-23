import { User } from '@prisma/client';

/**
 * API のレスポンスに載せてよいユーザー情報。
 * passwordHash を含む Prisma の User をそのまま返すと漏洩するため、
 * 外に出すときは必ずこの型に絞る。
 */
export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'createdAt'>;

/**
 * JWT に詰める中身。`sub`(subject) は「このトークンは誰のものか」を表す JWT の標準クレーム。
 * トークンは署名されているだけで暗号化はされていない（誰でも中身を読める）ので、
 * 秘密の情報は入れないこと。
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
