import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * POST /auth/register の入力（docs/design.md 5-2 Auth）。
 * main.ts の ValidationPipe が whitelist: true なので、
 * ここに無いプロパティ（例: 勝手な isAdmin）は送られても捨てられる。
 */
export class RegisterDto {
  @IsEmail({}, { message: 'email の形式が正しくありません' })
  email: string;

  // 上限 72 は bcrypt の仕様（73バイト目以降は無視される）に合わせた明示的な制限。
  @IsString()
  @MinLength(8, { message: 'password は8文字以上にしてください' })
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
