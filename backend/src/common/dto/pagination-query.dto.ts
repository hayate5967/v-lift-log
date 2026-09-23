import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * 一覧系エンドポイント（Records/Feed）で共通利用するページングクエリ。
 * cursorは直前ページ最後の要素のid（Prismaのcursorページネーションにそのまま渡す）。
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
