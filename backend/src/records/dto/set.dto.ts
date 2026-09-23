import { IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

/** Record作成/更新に含まれる1セット分の入力。 */
export class SetDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsNumber()
  @IsPositive()
  weight: number;

  @IsInt()
  @IsPositive()
  reps: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  velocity?: number;
}
