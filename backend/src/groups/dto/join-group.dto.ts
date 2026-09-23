import { IsString, MinLength } from 'class-validator';

/** POST /groups/join の入力（docs/api-spec.md 3章 Groups）。 */
export class JoinGroupDto {
  @IsString()
  @MinLength(1)
  joinCode: string;
}
