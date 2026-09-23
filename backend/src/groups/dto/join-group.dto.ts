import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

/**
 * POST /groups/join の入力（docs/api-spec.md 3章 Groups）。
 * 参加コードは手入力を想定しているため、前後の空白除去と大文字化を検証前に行う
 * （生成側は常に大文字なので、小文字で打ち込んでも一致するようにする）。
 */
export class JoinGroupDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(1)
  joinCode: string;
}
