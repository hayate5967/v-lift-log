import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** GET /feed の入力（docs/api-spec.md 5章 Records/Feed）。groupId指定でその1グループに絞る。 */
export class FeedQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;
}
