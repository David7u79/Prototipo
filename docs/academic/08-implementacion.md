# Implementación

El monorepo pnpm/Turborepo contiene API NestJS, web Next.js, landing Astro y móvil Expo.
La API emite JWT HS256 de acceso y refresh opaco; usa argon2id para contraseñas. Google
verifica el ID token en servidor. Los endpoints de releases sólo leen y descargan; la
publicación se realiza por CLI. OpenAPI se exporta sin base de datos y Prisma genera el ERD.

Los detalles de decisiones están en los [ADR](../adr/README.md) y los flujos en
[arquitectura](../architecture/containers.md).
