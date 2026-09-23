import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // 秘密鍵は .env から読む（ハードコード禁止）。
    // ConfigService を使うため registerAsync + useFactory の形にする。
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // 環境変数は string としか分からないが、jsonwebtoken 側は '7d' のような
          // リテラル形式の型を要求するため、ここだけ型を合わせる。
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '7d') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // 他モジュール（Groups / Records など）が JwtAuthGuard を使えるよう公開する。
  exports: [AuthService],
})
export class AuthModule {}
