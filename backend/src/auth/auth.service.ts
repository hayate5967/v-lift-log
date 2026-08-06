import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { JwtPayload, PublicUser, toPublicUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** bcrypt のコスト。大きいほど安全だが遅くなる。10 は一般的な既定値。 */
const SALT_ROUNDS = 10;

/**
 * ログイン失敗時のメッセージは常にこれで統一する。
 * 「メールが存在しない」「パスワードが違う」を区別して返すと、
 * どのメールアドレスが登録済みかを外部から総当たりで調べられてしまう。
 */
const INVALID_CREDENTIALS = 'メールアドレスまたはパスワードが正しくありません';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  /** POST /auth/register: 新規登録して、そのままログイン済みの状態（トークン）を返す。 */
  async register(
    dto: RegisterDto,
  ): Promise<{ user: PublicUser; token: string }> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    // 平文のパスワードは保存しない。ハッシュ化してから Repository に渡す。
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    return { user: toPublicUser(user), token: this.signToken(user) };
  }

  /** POST /auth/login: パスワードを照合してトークンを発行する。 */
  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      // 存在しないメールだと即座に返ると、応答時間の差で登録済みかどうかが推測できる。
      // 同等コストの計算を挟んで時間差を消す（タイミング攻撃対策）。
      await bcrypt.hash(dto.password, SALT_ROUNDS);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // bcrypt は復号できない。入力を同じ手順で変換して一致するかを比べる。
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return { token: this.signToken(user) };
  }

  /**
   * JwtStrategy から呼ばれる。署名が正しくても、その後に退会したユーザーの
   * トークンが使い続けられないよう、DB に実在するかを毎回確認する。
   */
  async validateJwtPayload(payload: JwtPayload): Promise<PublicUser> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }
    return toPublicUser(user);
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }
}
