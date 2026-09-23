import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /exercises の入力（docs/api-spec.md 4章 Exercises）。 */
export class CreateExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
