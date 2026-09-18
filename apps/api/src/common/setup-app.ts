import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ApiExceptionFilter } from './api-exception.filter.js';
import type { Env } from './config/env.js';

/**
 * Configuración HTTP compartida por main.ts, los tests de integración y la exportación
 * de OpenAPI, para que los tres vean exactamente la misma API.
 */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // La API usa tokens Bearer; no habilitamos credenciales CORS por defecto. Aun así,
  // la validación de entorno exige orígenes explícitos en producción para no dejar
  // abierta una futura integración basada en cookies.
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }), credentials: false });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const options = new DocumentBuilder()
    .setTitle('GarFit API')
    .setDescription('API central de GarFit: autenticación, perfil del atleta y releases.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, options);
}
