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

/**
 * PATCH /records/:id の入力。全フィールド任意。
 * sets / visibilityGroupIds は「キーを含めたら全置換、含めなければ現状維持」。
 */
export class UpdateRecordDto {
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SetDto)
  sets?: SetDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityGroupIds?: string[];
}
