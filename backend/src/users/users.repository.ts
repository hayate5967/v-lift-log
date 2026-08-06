import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * User テーブルへのアクセスを集約する Repository 層。
 * AGENTS.md の層構造どおり、Prisma を直接触るのはこのクラスだけにする。
 * ここには認可判定やビジネスロジックを書かない（それは Service の責務）。
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** ログイン時の照合と、登録時の重複チェックに使う。 */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** JWT の検証後、トークンに入っていた userId から本人を引くのに使う。 */
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** passwordHash は Service 側でハッシュ化済みの値を受け取る（平文を渡さない）。 */
  create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
