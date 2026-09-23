import { IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

/**
 * Record作成/更新に含まれる1セット分の入力。
 * weight/velocityは0を許容する（自重種目のweight=0、停止レップのvelocity=0など、
 * 正当に発生しうる値のため@IsPositiveではなく@Min(0)にしている）。
 * repsは「セット」の定義上1回以上を要求する。
 */
export class SetDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsInt()
  @IsPositive()
  reps: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  velocity?: number;
}
