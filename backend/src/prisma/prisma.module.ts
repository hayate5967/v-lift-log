import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// 全モジュールが Prisma を使うため Global にして、各モジュールでの import を省く。
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
