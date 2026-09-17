# 0001 Monorepo con Turborepo

Estado: Aceptado

## Contexto

Web, móvil, landing, API y contratos deben evolucionar coordinadamente.

## Decisión

Usar pnpm workspaces y Turborepo, con paquetes internos TypeScript crudo.

## Alternativas consideradas

Repositorios independientes; publicar paquetes en un registro; copiar contratos.

## Consecuencias

Hay instalaciones y tareas centralizadas; los consumidores resuelven código fuente y
deben mantener compatibilidad de TypeScript.
