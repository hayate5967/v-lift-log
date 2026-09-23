import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Exercise } from '@prisma/client';
import type { PublicUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExercisesService } from './exercises.service';

/** docs/api-spec.md 4章「Exercises」のエンドポイント。全て (auth)。 */
@Controller('exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@CurrentUser() user: PublicUser): Promise<Exercise[]> {
    return this.exercises.listForUser(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateExerciseDto,
  ): Promise<Exercise> {
    return this.exercises.create(user.id, dto);
  }
}
