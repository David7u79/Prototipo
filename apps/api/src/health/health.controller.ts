import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { PrismaService } from '../prisma/prisma.service.js';

// apps/api/package.json: está dos niveles arriba tanto desde src/health como desde dist/health.
const { version: API_VERSION } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

export class HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded'] }) status!: 'ok' | 'degraded';
  @ApiProperty({ enum: ['up', 'down'] }) database!: 'up' | 'down';
  @ApiProperty() version!: string;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Siempre responde 200; `status: degraded` indica que la base de datos no responde. */
  @Get()
  @ApiOkResponse({ type: HealthResponse })
  async check(): Promise<HealthResponse> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(
      () => 'up' as const,
      () => 'down' as const,
    );
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}
