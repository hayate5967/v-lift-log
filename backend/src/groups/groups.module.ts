import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';

/**
 * 他モジュール（Records/Feed）が所属確認に使えるよう GroupsRepository を公開する。
 * Service は本モジュール内に閉じる（他モジュールへは export しない）。
 */
@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsRepository],
})
export class GroupsModule {}
