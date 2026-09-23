import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsQueryDto } from './dto/stats-query.dto';
import { StatsPoint, StatsService } from './stats.service';

/** docs/api-spec.md 6章「Stats」のエンドポイント。 */
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  get(
    @CurrentUser() user: PublicUser,
    @Query() query: StatsQueryDto,
  ): Promise<StatsPoint[]> {
    return this.stats.getStats(user.id, query);
  }
}
