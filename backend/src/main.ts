import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const port = configService.get<number>('PORT', 3001);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: corsOrigin,
  });

  await app.listen(port);
}
bootstrap();
