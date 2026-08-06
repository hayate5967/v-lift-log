import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma へのアクセスはこのサービス経由に集約する。
 * AGENTS.md の層構造どおり、Controller から直接触らないこと。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
