import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateRecordDto } from './dto/create-record.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordWithRelations } from './records.repository';
import { RecordsService } from './records.service';

/**
 * docs/api-spec.md 5章「Records」のエンドポイント。
 * `/records/*` と `/groups/:groupId/records` にまたがるため、共通の Controller prefix は使わない。
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Post('records')
  create(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateRecordDto,
  ): Promise<RecordWithRelations> {
    return this.records.create(user.id, dto);
  }

  @Get('records')
  listOwn(
    @CurrentUser() user: PublicUser,
    @Query() pagination: PaginationQueryDto,
  ): Promise<RecordWithRelations[]> {
    return this.records.listOwn(user.id, pagination);
  }

  @Get('records/:id')
  detail(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
  ): Promise<RecordWithRelations> {
    return this.records.getForView(user.id, id);
  }

  @Patch('records/:id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ): Promise<RecordWithRelations> {
    return this.records.update(user.id, id, dto);
  }

  @Delete('records/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.records.remove(user.id, id);
  }

  @Get('groups/:groupId/records')
  listByGroup(
    @CurrentUser() user: PublicUser,
    @Param('groupId') groupId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<RecordWithRelations[]> {
    return this.records.listByGroup(user.id, groupId, pagination);
  }

  @Get('feed')
  feed(
    @CurrentUser() user: PublicUser,
    @Query() query: FeedQueryDto,
  ): Promise<RecordWithRelations[]> {
    return this.records.listFeed(user.id, query);
  }
}
