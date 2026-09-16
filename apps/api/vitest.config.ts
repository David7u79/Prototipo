import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Migra la base de pruebas (TEST_DATABASE_URL) una vez antes de toda la suite.
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/env-setup.ts'],
    // Los tests de integración comparten una base de datos: se ejecutan en serie.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/cli/**', 'src/main.ts'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
