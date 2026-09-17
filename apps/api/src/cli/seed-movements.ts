/**
 * Carga o actualiza el catálogo de movimientos desde @garfit/movements/catalog.json.
 * Idempotente: puede ejecutarse varias veces sin duplicar. Uso: `pnpm db:seed`.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { loadCatalog, seedMovements } from '../movements/seed/seed-movements.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL no está definida');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
try {
  const catalog = await loadCatalog();
  const result = await seedMovements(prisma, catalog);
  console.log(
    `Catálogo ${catalog.source.repository}@${catalog.source.commit.slice(0, 7)}: ` +
      `${result.created} creados, ${result.updated} actualizados, ` +
      `${result.deactivated} desactivados.`,
  );
} finally {
  await prisma.$disconnect();
}
