import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';

/** Aplica las migraciones de Prisma sobre la base de pruebas antes de la suite. */
export default function setup(): void {
  config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL no está definida. Levanta PostgreSQL con `pnpm db:up` ' +
        'y cópiala desde apps/api/.env.example.',
    );
  }
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
