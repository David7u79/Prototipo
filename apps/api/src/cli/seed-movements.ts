/**
 * Carga o actualiza el catálogo de movimientos desde @garfit/movements/catalog.json.
 * Idempotente: puede ejecutarse varias veces sin duplicar. Uso: `pnpm db:seed`.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  BENCHMARK_SOURCE,
  BENCHMARK_WODS,
  CURATED_SOURCE,
  curatedMovements,
} from '@garfit/movements';
import { loadCatalog, seedMovements } from '../movements/seed/seed-movements.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL no está definida');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
try {
  const catalog = await loadCatalog();
  const result = await seedMovements(prisma, catalog);
  const curated = curatedMovements();
  const current = await prisma.movement.findMany({
    where: { slug: { in: curated.map((movement) => movement.slug) } },
    select: { slug: true },
  });
  for (const movement of curated) {
    await prisma.movement.upsert({
      where: { slug: movement.slug },
      create: { ...movement, source: CURATED_SOURCE, sourceId: movement.slug, isActive: true },
      update: { ...movement, source: CURATED_SOURCE, sourceId: movement.slug, isActive: true },
    });
  }
  const deactivated = await prisma.movement.updateMany({
    where: { source: CURATED_SOURCE, slug: { notIn: curated.map((movement) => movement.slug) } },
    data: { isActive: false },
  });
  const movements = await prisma.movement.findMany({
    where: {
      slug: { in: BENCHMARK_WODS.flatMap((wod) => wod.exercises.map((item) => item.movementSlug)) },
    },
    select: { id: true, slug: true },
  });
  const ids = new Map(movements.map((movement) => [movement.slug, movement.id]));
  for (const wod of BENCHMARK_WODS) {
    for (const exercise of wod.exercises) {
      if (!ids.has(exercise.movementSlug)) {
        throw new Error(`Falta el movimiento ${exercise.movementSlug} para el WOD ${wod.slug}`);
      }
    }
    const { exercises: _exercises, ...wodData } = wod;
    const saved = await prisma.wod.upsert({
      where: { slug: wod.slug },
      create: { ...wodData, ownerId: null, isBenchmark: true, source: BENCHMARK_SOURCE },
      update: { ...wodData, ownerId: null, isBenchmark: true, source: BENCHMARK_SOURCE },
    });
    await prisma.wodExercise.deleteMany({ where: { wodId: saved.id } });
    await prisma.wodExercise.createMany({
      data: wod.exercises.map(({ movementSlug, ...exercise }, index) => ({
        ...exercise,
        wodId: saved.id,
        movementId: ids.get(movementSlug)!,
        position: index + 1,
      })),
    });
  }
  console.log(
    `Catálogo ${catalog.source.repository}@${catalog.source.commit.slice(0, 7)}: ` +
      `${result.created} creados, ${result.updated} actualizados, ` +
      `${result.deactivated} desactivados.`,
  );
  console.log(
    `Curados: ${curated.length - current.length} creados, ${current.length} actualizados, ${deactivated.count} desactivados.`,
  );
  console.log(`WODs benchmark: ${BENCHMARK_WODS.length} sincronizados.`);
} finally {
  await prisma.$disconnect();
}
