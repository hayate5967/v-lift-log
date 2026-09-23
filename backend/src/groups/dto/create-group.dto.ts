import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /groups の入力（docs/api-spec.md 3章 Groups）。 */
export class CreateGroupDto {
  // trimしてから検証する。空白のみの名前（例: "   "）がMinLength(1)を素通りしないようにするため。
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
