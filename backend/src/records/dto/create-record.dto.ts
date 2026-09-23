import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SetDto } from './set.dto';

/** POST /records の入力（docs/api-spec.md 5章 Records）。 */
export class CreateRecordDto {
  @IsString()
  exerciseId: string;

  @IsDateString()
  performedAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SetDto)
  sets: SetDto[];

  /** 未指定/空配列なら「自分だけ」（RecordVisibilityの行を作らない）。 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityGroupIds?: string[];
}
