import type { CatalogMovement } from '@garfit/movements';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Forma de `@garfit/movements/catalog.json`. */
export interface MovementCatalog {
  source: { repository: string; commit: string };
  movements: CatalogMovement[];
}

export interface SeedResult {
  created: number;
  updated: number;
  /** Movimientos de la misma fuente que pasaron de activos a inactivos en esta ejecución. */
  deactivated: number;
}

const BATCH_SIZE = 200;

export async function loadCatalog(): Promise<MovementCatalog> {
  const require = createRequire(import.meta.url);
  const path = require.resolve('@garfit/movements/catalog.json');
  return JSON.parse(await readFile(path, 'utf8')) as MovementCatalog;
}

/**
 * Sincroniza el catálogo con la base de datos de forma idempotente:
 * - upsert por `slug` (identificador estable) de cada movimiento del catálogo;
 * - `description` y `difficulty` no se tocan en actualizaciones (pueden curarse a mano);
 * - los movimientos de la misma fuente que ya no están en el catálogo se desactivan, nunca se
 *   borran, porque puede haber marcas personales que los referencian.
 */
export async function seedMovements(
  prisma: PrismaClient,
  catalog: MovementCatalog,
): Promise<SeedResult> {
  const source = catalog.source.repository;
  const slugs = catalog.movements.map((movement) => movement.slug);

  const existing = await prisma.movement.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((movement) => movement.slug));

  for (let start = 0; start < catalog.movements.length; start += BATCH_SIZE) {
    const batch = catalog.movements.slice(start, start + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((movement) => {
        const data = {
          source,
          sourceId: movement.sourceId,
          name: movement.name,
          instructions: movement.instructions,
          category: movement.category,
          equipment: movement.equipment,
          primaryMuscles: movement.primaryMuscles,
          secondaryMuscles: movement.secondaryMuscles,
          recordTypes: movement.recordTypes,
          isActive: true,
        };
        return prisma.movement.upsert({
          where: { slug: movement.slug },
          create: { slug: movement.slug, ...data },
          update: data,
        });
      }),
    );
  }

  const { count: deactivated } = await prisma.movement.updateMany({
    where: { source, isActive: true, slug: { notIn: slugs } },
    data: { isActive: false },
  });

  return {
    created: slugs.length - existingSlugs.size,
    updated: existingSlugs.size,
    deactivated,
  };
}
