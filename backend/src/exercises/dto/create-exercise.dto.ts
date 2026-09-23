import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /exercises の入力（docs/api-spec.md 4章 Exercises）。 */
export class CreateExerciseDto {
  // trimしてから検証する。空白のみの名前がMinLength(1)を素通りしないようにするため
  // （backend/src/groups/dto/create-group.dto.ts と同じ方針）。
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
