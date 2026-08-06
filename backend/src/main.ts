import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 外部入力は必ず DTO で検証する（AGENTS.md のセキュリティ方針）。
  // whitelist: DTO に無いプロパティを落とす / forbidNonWhitelisted: 混入時は 400 で弾く
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
