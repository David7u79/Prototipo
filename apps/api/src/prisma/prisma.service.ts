import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../common/config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cliente Prisma 7 con el driver adapter de PostgreSQL. No se conecta al arrancar: la conexión
 * se abre con la primera consulta, así la API arranca (y exporta OpenAPI) sin base de datos.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
