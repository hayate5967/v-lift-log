import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JwtPayload, PublicUser } from './auth.types';

/**
 * `Authorization: Bearer <token>` からトークンを取り出し、署名と有効期限を検証する。
 * 検証を通ると validate() が呼ばれ、その戻り値が request.user に入る。
 * この Strategy に 'jwt' という名前が付き、JwtAuthGuard から参照される。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    // super() より前に this は使えないため、秘密鍵はローカル変数で受け取る。
    // 未設定のまま起動すると全員のトークンが検証できないので、getOrThrow で早期に落とす。
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** 認可判定・DB確認は Service の責務なので、ここでは委譲するだけ。 */
  validate(payload: JwtPayload): Promise<PublicUser> {
    return this.auth.validateJwtPayload(payload);
  }
}
