import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';

/**
 * User の永続化を担当するモジュール。
 * 現時点では Repository のみを公開し、AuthModule から利用する。
 * ユーザー向けのエンドポイントが必要になったら Controller / Service を足す。
 */
@Module({
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
