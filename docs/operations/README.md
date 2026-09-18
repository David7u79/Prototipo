# Manual técnico

Documentación de operación de GarFit: cómo se instala, se ejecuta, se prueba, se compila, se
publica y se respalda. El manual de uso de la aplicación, pensado para el atleta, está en
[`docs/academic/11-manual-de-operacion.md`](../academic/11-manual-de-operacion.md).

| Documento | Para qué |
| --- | --- |
| [`deployment.md`](deployment.md) | Topología, variables por servicio, imágenes y despliegue detrás de un proxy inverso. |
| [`android-signing.md`](android-signing.md) | Firma de la aplicación Android, custodia del keystore y qué ocurre si se pierde. |
| [`release.md`](release.md) | Procedimiento completo de publicación: versión, verificación, compilación, firma, manifiesto, publicación y comprobación. |
| [`backup-restore.md`](backup-restore.md) | Copia y restauración de PostgreSQL y del almacenamiento de releases. |

## Instalación para desarrollo

Requisitos: Node 24 o superior, pnpm 11.20.0, Docker (para PostgreSQL) y, sólo si se va a compilar
la aplicación Android, JDK 21 y el SDK de Android con build-tools.

```bash
pnpm install                      # instala todo el monorepo
pnpm db:up                        # PostgreSQL en el puerto 5442 (bases garfit y garfit_test)
pnpm --filter @garfit/api prisma:generate
pnpm db:migrate                   # aplica migraciones
pnpm db:seed                      # catálogo de movimientos y WODs benchmark
pnpm dev                          # API, web y landing en paralelo
pnpm dev:mobile                   # aplicación móvil (Expo), aparte
```

Cada aplicación tiene su `.env.example`; cópialo a `.env` (o `.env.local` en la web) y rellena lo
necesario. Ninguna variable con secreto tiene valor por defecto y ningún `.env` se versiona.

## Variables por servicio

| Servicio | Variables principales |
| --- | --- |
| API | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `PUBLIC_API_URL`, `CORS_ORIGINS`, `GOOGLE_WEB_CLIENT_ID`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_ENABLED`, `AI_PROVIDER`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_PER_MINUTE`, `AI_RATE_LIMIT_PER_DAY`, `RELEASES_STORAGE_DIR` |
| Web | `PUBLIC_API_URL` y las equivalentes de Next.js declaradas en su `.env.example` |
| Landing | `PUBLIC_API_URL` |
| Móvil | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Demostración | `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_ALLOW_PRODUCTION` |

Las diferencias entre `development`, `test`, `demo` y `production` están documentadas en
[`deployment.md`](deployment.md).

## Base de datos y migraciones

```bash
pnpm db:migrate                                   # aplica migraciones pendientes
pnpm --filter @garfit/api exec prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --script   # genera el SQL de un cambio
```

Las migraciones se crean con `migrate diff` y se aplican con `migrate deploy`: `migrate dev` es
interactivo y no funciona en esta configuración. El ERD se regenera con `pnpm docs:generate` y no se
edita a mano.

## Semillas y demostración

```bash
pnpm db:seed                                       # catálogo (idempotente)
DEMO_USER_EMAIL=... DEMO_USER_PASSWORD=... pnpm demo:reset   # estado de demostración reproducible
```

`demo:reset` aplica migraciones, siembra el catálogo si falta y reconstruye únicamente la cuenta de
demostración con entrenamientos, marcas, ejecuciones del WOD `fran` y un análisis guardado. Se puede
repetir tantas veces como haga falta. El guion de la demostración está en
[`docs/demo/DEMO-SCRIPT.md`](../demo/DEMO-SCRIPT.md) y el plan B en
[`DEMO-FALLBACK.md`](../demo/DEMO-FALLBACK.md).

## Verificación

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:coverage        # informes de cobertura
pnpm evidence:web         # recorridos Playwright y capturas (requiere API y web levantadas)
pnpm docs:generate        # OpenAPI, ERD, TypeDoc, cobertura y BUILD_INFO
pnpm docs:check           # falla si los artefactos generados difieren de los versionados
pnpm docs:check-openapi   # ninguna respuesta 2xx sin esquema
pnpm security:scan        # secretos en ficheros versionados
pnpm test:gemini          # llamada real a Gemini; se omite sin GEMINI_API_KEY
pnpm release:check        # todo lo anterior, como puerta previa a publicar
```

## Compilación y publicación de Android

El procedimiento completo está en [`release.md`](release.md); la gestión de la clave de firma, en
[`android-signing.md`](android-signing.md).

## Copias de seguridad

Procedimiento mínimo de copia y restauración de PostgreSQL y del almacenamiento de releases en
[`backup-restore.md`](backup-restore.md).
