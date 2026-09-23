import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ExercisesRepository } from './exercises.repository';
import { ExercisesService } from './exercises.service';

/** 他モジュール（Records）が種目の存在確認に使えるよう ExercisesRepository を公開する。 */
@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService, ExercisesRepository],
  exports: [ExercisesRepository],
})
export class ExercisesModule {}
