import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

// 機能モジュール（Auth / Users / Groups / Exercises / Records / Stats / Devices / Sessions）は
// docs/design.md 5-1 に従って第1部で追加していく。
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
