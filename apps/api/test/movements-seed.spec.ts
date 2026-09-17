import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  loadCatalog,
  type MovementCatalog,
  seedMovements,
} from '../src/movements/seed/seed-movements.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';

describe('semilla del catálogo de movimientos', () => {
  let ctx: TestApp;
  let catalog: MovementCatalog;

  beforeAll(async () => {
    ctx = await createTestApp();
    catalog = await loadCatalog();
  });
  beforeEach(async () => resetDatabase(ctx.prisma));
  afterAll(async () => ctx.app.close());

  it('es idempotente con el catálogo real', async () => {
    const first = await seedMovements(ctx.prisma, catalog);
    expect(first).toEqual({ created: 1319, updated: 0, deactivated: 0 });

    const second = await seedMovements(ctx.prisma, catalog);
    expect(second).toEqual({ created: 0, updated: 1319, deactivated: 0 });
    expect(await ctx.prisma.movement.count()).toBe(1319);
    expect(await ctx.prisma.movement.count({ where: { isActive: true } })).toBe(1319);
  }, 60_000);

  it('no pisa una descripción curada al volver a sembrar', async () => {
    const small = { ...catalog, movements: catalog.movements.slice(0, 3) };
    await seedMovements(ctx.prisma, small);
    const slug = small.movements[0]!.slug;
    await ctx.prisma.movement.update({ where: { slug }, data: { description: 'Curada a mano' } });

    await seedMovements(ctx.prisma, small);
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug } });
    expect(movement.description).toBe('Curada a mano');
  });

  it('desactiva, sin borrar, un movimiento que sale del catálogo y conserva sus marcas', async () => {
    const small = { ...catalog, movements: catalog.movements.slice(0, 3) };
    await seedMovements(ctx.prisma, small);
    const removed = small.movements[2]!;
    const user = await ctx.prisma.user.create({ data: { email: 'seed@example.com' } });
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: removed.slug } });
    await ctx.prisma.personalRecord.create({
      data: {
        userId: user.id,
        movementId: movement.id,
        recordType: 'REPS',
        value: 10,
        unit: 'REPETITION',
        normalizedValue: 10,
        performedAt: new Date('2026-01-10T00:00:00Z'),
      },
    });

    const result = await seedMovements(ctx.prisma, {
      ...small,
      movements: small.movements.slice(0, 2),
    });
    expect(result).toEqual({ created: 0, updated: 2, deactivated: 1 });
    const after = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: removed.slug } });
    expect(after.isActive).toBe(false);
    expect(await ctx.prisma.personalRecord.count({ where: { movementId: after.id } })).toBe(1);
  });
});
