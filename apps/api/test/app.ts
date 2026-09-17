import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/common/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * Levanta la API completa contra la base de pruebas. `customize` permite sustituir
 * proveedores (p. ej. GoogleIdentityVerifier o ReleaseStorage).
 */
export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<TestApp> {
  const moduleRef = await customize(Test.createTestingModule({ imports: [AppModule] })).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Vacía todas las tablas de dominio entre tests. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "PersonalRecord", "Movement", "Session", "AuthAccount",
      "AthleteProfile", "AppRelease", "User" CASCADE`,
  );
}
