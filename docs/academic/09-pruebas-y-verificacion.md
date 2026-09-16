# Pruebas y verificación

El método combina pruebas Vitest de paquetes y API, verificación de tipos, lint, build y
artefactos generados. Ejecute `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y
`pnpm docs:check`; para cobertura use `pnpm test:coverage` y consulte
[SUMMARY.md](../generated/coverage/SUMMARY.md).

Las pruebas de API requieren `TEST_DATABASE_URL` y PostgreSQL de prueba. La trazabilidad
identifica pruebas por requerimiento.

> **PENDIENTE:** salidas fechadas, commit y resultados de ejecución para anexar como
> evidencia; responsable: tesista.
