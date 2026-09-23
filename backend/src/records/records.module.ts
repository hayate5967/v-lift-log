import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { GroupsModule } from '../groups/groups.module';
import { RecordsController } from './records.controller';
import { RecordsRepository } from './records.repository';
import { RecordsService } from './records.service';

/**
 * 認可判定（所属グループ確認・種目存在確認）に GroupsRepository / ExercisesRepository を使うため、
 * それぞれのモジュールを import する。
 */
@Module({
  imports: [GroupsModule, ExercisesModule],
  controllers: [RecordsController],
  providers: [RecordsService, RecordsRepository],
})
export class RecordsModule {}
