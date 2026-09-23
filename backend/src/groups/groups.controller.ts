import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Group } from '@prisma/client';
import type { PublicUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupMember } from './groups.repository';
import { GroupsService } from './groups.service';

/**
 * docs/api-spec.md 3章「Groups」のエンドポイント。
 * 全エンドポイントが (auth) のため、クラスレベルで Guard を付ける。
 */
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateGroupDto,
  ): Promise<{ group: Group; joinCode: string }> {
    return this.groups.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: PublicUser): Promise<Group[]> {
    return this.groups.listForUser(user.id);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
  ): Promise<{ group: Group; members: GroupMember[] }> {
    return this.groups.getDetail(user.id, id);
  }

  /** 参加は既存メンバーを増やすだけで新規作成ではないため 200 に上書きする。 */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(
    @CurrentUser() user: PublicUser,
    @Body() dto: JoinGroupDto,
  ): Promise<{ group: Group }> {
    return this.groups.join(user.id, dto);
  }
}
