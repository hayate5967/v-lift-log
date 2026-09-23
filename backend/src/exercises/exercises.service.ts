import { Injectable } from '@nestjs/common';
import { Exercise } from '@prisma/client';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExercisesRepository } from './exercises.repository';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercises: ExercisesRepository) {}

  /** GET /exercises: 既定種目+自分のカスタム種目。 */
  listForUser(userId: string): Promise<Exercise[]> {
    return this.exercises.findVisibleToUser(userId);
  }

  /** POST /exercises: カスタム種目の作成。名前の重複チェックは行わない。 */
  create(userId: string, dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercises.create({
      name: dto.name,
      createdByUserId: userId,
    });
  }
}
