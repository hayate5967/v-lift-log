import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ExercisesModule } from './exercises/exercises.module';
import { GroupsModule } from './groups/groups.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecordsModule } from './records/records.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';

// 機能モジュール（Auth / Users / Groups / Exercises / Records / Stats / Devices / Sessions）は
// docs/design.md 5-1 に従って第1部で追加していく。
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    GroupsModule,
    ExercisesModule,
    RecordsModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
