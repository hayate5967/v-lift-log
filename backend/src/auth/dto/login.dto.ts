import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * POST /auth/login の入力（docs/design.md 5-2 Auth）。
 * ログインでは password の長さ制約をかけない。
 * 「8文字未満だから 400」と返すと、パスワードポリシーの情報を攻撃者に与えるため、
 * 照合失敗と同じ 401 に寄せる。
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
