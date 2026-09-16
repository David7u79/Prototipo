import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './common/config/env.js';
import { createOpenApiDocument, setupApp } from './common/setup-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  setupApp(app);
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    SwaggerModule.setup('docs', app, createOpenApiDocument(app));
  }

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
