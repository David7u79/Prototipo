# Entrega de GarFit

Este índice reúne los artefactos de entrega sin duplicar binarios ni evidencia pesada.

| Artefacto | Ubicación |
| --- | --- |
| Documentación académica | [docs/academic](../academic/00-indice.md) |
| Manual de operación | [capítulo 11](../academic/11-manual-de-operacion.md) |
| Diagramas de arquitectura | [arquitectura final](../architecture/final-architecture.md) y [arquitectura existente](../architecture/) |
| Evidencia de pruebas y capturas | [docs/evidence](../evidence/) |
| APK publicado | Almacenamiento de releases servido por la API; la landing consulta sus metadatos y descarga. No se duplica el binario en Git. |
| Código fuente | Raíz del repositorio y workspaces `apps/` y `packages/` |
| Manifiesto de release | [package.json](../../package.json), fuente única de `0.9.0-rc.1` y `versionCode` 6; `pnpm version:sync` lo propaga. |

La instalación física de la APK sigue pendiente de un dispositivo Android; consúltese [Pendientes externos](../academic/PENDIENTES-EXTERNOS.md).

## Índice ampliado de entrega

Este índice separa documentos de lectura, evidencia histórica y salidas derivadas.
Todas las rutas son relativas a la raíz del repositorio; los comandos indicados permiten
regenerar lo derivable sin tratar una copia antigua como evidencia actual.

## Documentación académica

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| Índice académico | Estructura de capítulos: [`docs/academic/00-indice.md`](../academic/00-indice.md). | Redacción manual; adjuntar como texto. |
| Factibilidad | Viabilidad, restricciones y riesgos: [`docs/academic/04-estudio-de-factibilidad.md`](../academic/04-estudio-de-factibilidad.md). | Redacción manual; adjuntar como texto. |
| Diseño, datos e implementación | Capítulos 6, 7 y 8 en `docs/academic/06-diseno-del-sistema.md`, `07-modelo-de-datos.md` y `08-implementacion.md`. | Respaldados por ERD, OpenAPI y código. |
| Pruebas y resultados | [`09-pruebas-y-verificacion.md`](../academic/09-pruebas-y-verificacion.md) y [`10-resultados.md`](../academic/10-resultados.md). | Se revisan contra los informes por fase. |
| Cumplimiento y pendientes | [`CUMPLIMIENTO-LINEAMIENTOS.md`](../academic/CUMPLIMIENTO-LINEAMIENTOS.md) y [`PENDIENTES-EXTERNOS.md`](../academic/PENDIENTES-EXTERNOS.md). | Redacción manual; adjuntar como texto. |

## Manual de operación y manual técnico

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| Manual de operación | Preparación, uso, IA y distribución, secciones 11.1–11.10: [`docs/academic/11-manual-de-operacion.md`](../academic/11-manual-de-operacion.md). | Redacción manual; adjuntar como texto. |
| Manual técnico | Scripts, requisitos y arquitectura: [`README.md`](../../README.md). | Verificar los comandos en entorno preparado. |
| Firma Android | Instrucciones de firma y publicación: [`docs/operations/android-signing.md`](../operations/android-signing.md). | No incluir secretos ni keystores. |
| Trazabilidad | Requisitos y evidencia: [`docs/TRACEABILITY.md`](../TRACEABILITY.md). | Revisar contra pruebas y documentos. |

## Diagramas

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| Arquitectura final | Contexto, contenedores y flujo de datos: [`docs/architecture/final-architecture.md`](../architecture/final-architecture.md). | Mermaid/Markdown; adjuntar como texto. |
| Diagramas especializados | Contexto, autenticación, IA, atleta y releases: [`docs/architecture/`](../architecture/). | Redacción manual; adjuntar como texto. |
| ERD | Diagrama del modelo Prisma: [`docs/generated/database/erd.svg`](../generated/database/erd.svg). | `pnpm docs:generate`; comprobar con `pnpm docs:check`. |
| ADR | Decisiones de arquitectura: [`docs/adr/README.md`](../adr/README.md). | Redacción manual; adjuntar como texto. |

## Evidencia por fase

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| Fase 1 | Informe inicial: [`docs/evidence/fase-1/pruebas-2026-09-16.md`](../evidence/fase-1/pruebas-2026-09-16.md). | Histórico versionado; no reemplazar. |
| Fase 2 | Informe y capturas de registro, perfil, movimientos y marcas: [`docs/evidence/fase-2/`](../evidence/fase-2/). | Histórico versionado; se adjunta como evidencia. |
| Fase 3 | Informe y capturas de entrenamientos, WOD y progreso: [`docs/evidence/fase-3/`](../evidence/fase-3/). | Histórico versionado; se adjunta como evidencia. |
| Fase 4 | Informe y capturas de consentimiento, IA y evidencia: [`docs/evidence/fase-4/`](../evidence/fase-4/). | Histórico versionado; se adjunta como evidencia. |
| Fase 5 | Informe, Gemini, distribución y capturas Android: [`docs/evidence/fase-5/`](../evidence/fase-5/). | Histórico versionado; distingue lo pendiente. |

## Artefactos generados

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| OpenAPI | Contrato HTTP: [`docs/generated/openapi/openapi.yaml`](../generated/openapi/openapi.yaml) y [`openapi.json`](../generated/openapi/openapi.json). | `pnpm docs:generate`; validar con `pnpm docs:check` y `pnpm docs:check-openapi`. |
| Cobertura | Resumen: [`docs/generated/coverage/SUMMARY.md`](../generated/coverage/SUMMARY.md). | `pnpm test:coverage` o `pnpm docs:generate`; no es evidencia histórica por sí sola. |
| Información de compilación | Entorno, commit y versiones: [`docs/generated/BUILD_INFO.md`](../generated/BUILD_INFO.md). | `pnpm docs:generate`; entregar como contexto del corte. |
| TypeDoc | Referencia de paquetes: `docs/generated/typedoc/`. | `pnpm docs:generate`; no se versiona por ser salida derivada. |
| Cobertura HTML | Detalle navegable: `docs/generated/coverage/html/`. | `pnpm test:coverage`; no se versiona por ser salida pesada. |

## Código y repositorio

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| Aplicaciones | API, web, móvil y landing: `apps/api/`, `apps/web/`, `apps/mobile/`, `apps/landing/`. | `pnpm build`; entregar repositorio, no `node_modules`. |
| Paquetes compartidos | Dominio, validación, tipos, cliente y movimientos: `packages/`. | `pnpm build` y `pnpm test`. |
| Esquema y migraciones | Prisma: `apps/api/prisma/`. | `pnpm db:migrate` sobre una base preparada. |
| Dependencias y versión | [`package.json`](../../package.json) y [`pnpm-lock.yaml`](../../pnpm-lock.yaml). | `pnpm install --frozen-lockfile`; `pnpm version:check`. |

## APK publicado y manifiesto

| Artefacto | Qué es y dónde vive | Regeneración o entrega |
| --- | --- | --- |
| Evidencia de APK | Compilación, publicación y checksum: [`docs/evidence/fase-5/distribucion-android.md`](../evidence/fase-5/distribucion-android.md). | Histórico versionado; refiere versión y SHA-256 comprobados. |
| APK | Binario generado en `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`. | No se versiona ni adjunta por su peso; referir versión, `versionCode` y SHA-256 publicados. |
| Manifiesto de release | Fuente de `version` y `androidVersionCode`: [`package.json`](../../package.json). | `pnpm version:sync` propaga y `pnpm version:check` comprueba. |
| Release publicada | Metadatos y flujo: [`docs/architecture/android-distribution.md`](../architecture/android-distribution.md). | Recompilar, publicar y contrastar SHA-256; instalación física pendiente. |

## Verificación completa en una máquina limpia

1. Instale Node.js `>=22.12`, pnpm `11.20.0`, Docker/Docker Compose y Chromium para Playwright. Para APK también requiere JDK 21 y Android SDK.
2. Ejecute `pnpm install --frozen-lockfile` desde la raíz.
3. Ejecute `pnpm db:up`, `pnpm db:migrate` y `pnpm db:seed`.
4. Ejecute `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`.
5. Ejecute `pnpm test:coverage`, `pnpm docs:check`, `pnpm docs:check-openapi` y `pnpm version:check`.
6. Ejecute `pnpm exec playwright install chromium` cuando sea necesario y después `pnpm evidence:web`.
7. Para APK, ejecute `pnpm --filter @garfit/mobile exec expo prebuild --platform android --clean`; en `apps/mobile/android`, ejecute `./gradlew assembleRelease`; en PowerShell use `Get-FileHash .\app\build\outputs\apk\release\app-release.apk -Algorithm SHA256`. Publicación e instalación requieren los recursos de [`PENDIENTES-EXTERNOS.md`](../academic/PENDIENTES-EXTERNOS.md).
