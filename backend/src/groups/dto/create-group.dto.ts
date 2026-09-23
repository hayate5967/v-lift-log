import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /groups の入力（docs/api-spec.md 3章 Groups）。 */
export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
