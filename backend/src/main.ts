import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { FiltroExcecaoHttp } from './common/filtros/filtro-excecao-http';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new FiltroExcecaoHttp());

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
    credentials: true,
  });

  // BACKEND_PORT e nao PORT: o Next.js le PORT, e o .env agora e compartilhado.
  await app.listen(Number(config.get<string>('BACKEND_PORT') ?? 3333));
}

void bootstrap();
