import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 必須のエンドポイントに付ける Guard（docs/design.md 5-2 の `(auth)`）。
 * トークンが無い・壊れている・期限切れなら 401 を返し、Controller には到達しない。
 *
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
