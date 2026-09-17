# 0003 API NestJS centralizada

Estado: Aceptado

## Contexto

Los clientes requieren reglas consistentes, autenticación y acceso a PostgreSQL.

## Decisión

Centralizar rutas y reglas de servidor en NestJS con Prisma/PostgreSQL y OpenAPI.

## Alternativas consideradas

Acceso directo de clientes a base de datos; APIs por cliente; lógica duplicada.

## Consecuencias

La API es la frontera de confianza. Los paquetes de cliente no se importan en runtime.
