import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { PublicUser } from './auth.types';

/**
 * JwtStrategy.validate() の戻り値（= ログイン中の本人）を引数として受け取る。
 *
 *   myRecords(@CurrentUser() user: PublicUser) { ... }
 *
 * 必ず JwtAuthGuard と併用すること。Guard が無いと request.user は undefined になる。
 * 「誰の操作か」はクライアントから受け取らず、必ずトークン由来のこの値を使う
 * （body の userId を信用すると、他人になりすませてしまう）。
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser => {
    const request = ctx.switchToHttp().getRequest<{ user: PublicUser }>();
    return request.user;
  },
);
