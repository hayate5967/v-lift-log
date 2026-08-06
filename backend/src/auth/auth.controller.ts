import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
// デコレータ付き引数を含むメソッドのシグネチャで使う型は、
// isolatedModules + emitDecoratorMetadata の制約により import type が必須。
import type { PublicUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * docs/design.md 5-2「Auth」のエンドポイント。
 * Controller は入口とレスポンス整形だけを担当し、判断は AuthService に委譲する。
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** リソースを新規作成するので 201 Created（NestJS の POST 既定値）。 */
  @Post('register')
  register(
    @Body() dto: RegisterDto,
  ): Promise<{ user: PublicUser; token: string }> {
    return this.auth.register(dto);
  }

  /** ログインは何も作らないので 200 OK に上書きする。 */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<{ token: string }> {
    return this.auth.login(dto);
  }

  /** Guard を通過した時点で本人が確定しているため、そのまま返すだけ。 */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: PublicUser): { user: PublicUser } {
    return { user };
  }
}
