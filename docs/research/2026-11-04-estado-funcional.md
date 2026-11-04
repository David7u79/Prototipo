# Estado funcional de GarFit — 2026-11-04

Auditoría de "cómo vamos y qué falta". Commit de referencia: `ce2511d` (árbol limpio).
Etiquetas: **VERIFICADO** = comando ejecutado y salida vista hoy. **INFERIDO** = lectura de código.

## Resumen

1. Las tres superficies (API, web, móvil) cubren todos los dominios; la API de producción responde (`/health` 200, BD `up`, `0.9.0-rc.1`, ~0,2–0,4 s). VERIFICADO.
2. En producción **no hay ninguna APK publicada** (`/releases/latest/android` → 404 `NO_RELEASE_PUBLISHED`): ahora mismo la landing no puede distribuir la app. VERIFICADO.
3. Google OAuth sigue apagado en producción (`google.enabled:false`) y la IA corre con proveedor `fake` según la bitácora. VERIFICADO (OAuth) / INFERIDO (IA, `/ai/status` exige sesión).
4. Hay un fallo probable de sesión en móvil: refrescos en paralelo sin exclusión mutua + detección de reutilización en la API = cierre de **todas** las sesiones del usuario tras 15 min. INFERIDO, alta confianza.
5. `typecheck` y `lint` pasan (0 errores, 8 avisos); `test` pasa en paquetes y web (167 tests) pero la API no corre sin PostgreSQL local (P1001). Móvil y Wear no tienen tests en `pnpm test`. VERIFICADO.

## Matriz de paridad

Método: rutas de controladores (`apps/api/src/**/*.controller.ts`) contra llamadas a `@garfit/api-client` en cada cliente (grep de `.<dominio>.<método>(`). INFERIDO salvo la columna "Prod".

| Dominio | API | Web | Móvil | Falta / nota | Prod |
| --- | --- | --- | --- | --- | --- |
| Auth local | `auth.controller.ts:42-89` (register/login/refresh/logout/me, throttle) | `auth-actions.ts:38-39`, refresh en `proxy.ts:44` | `lib/auth.tsx:184,191,99` | — | `/auth/me` 401 sin token ✔ |
| Auth Google | `auth.controller.ts:59`, `google-identity.verifier.ts` | `api/auth/google/route.ts:23` | `lib/auth.tsx:219` | Sin credenciales en prod | `google.enabled:false` ✔ |
| Perfil | `profile.controller.ts:25,33` | `app-actions.ts:42` | `lib/auth.tsx:125,139` | — | — |
| Movimientos | `movements.controller.ts:22,29` (sin guard: público) | `movements/page.tsx:38`, `[slug]/page.tsx:101` | `movements/index.tsx:41`, `[slug].tsx:25` | — | `GET /movements` 200, 1326 ítems ✔ |
| Marcas | `records.controller.ts:43-96` (CRUD) | crear `app-actions.ts:93`, editar `:117`, borrar `:130` | crear `records/new.tsx:66`, borrar `records/[movementSlug].tsx:57` | **Móvil no edita marcas** (`records.update` sin uso) | — |
| WODs | `wods.controller.ts:19-37` | lista/detalle/rendimiento + crear `wod-actions.ts:33` | `wods/index.tsx:23`, `wods/[slug].tsx:24,26,49` | **Móvil no crea WOD personal** (`wods.create` sin uso) | `/wods` 401 sin token ✔ |
| Entrenamientos | `workouts.controller.ts:38-101` | crear/editar/iniciar/resultados/completar/borrar `workout-actions.ts:49-128` | `workouts/new.tsx:119`, `workouts/[id].tsx:62-85` | **Móvil no edita borradores** (`workouts.update` sin uso; web sí, `workout-actions.ts:68`) | — |
| Historial | `GET /workouts`, `/workouts/stats` | `workouts/page.tsx:9`, `app/page.tsx:18` | `(tabs)/history.tsx:41`, `(tabs)/index.tsx:39` | — | — |
| IA | `ai.controller.ts:30-109` (consent, análisis, historial, cuota `ai.service.ts:442-445`) | `ai-actions.ts:24-76`, `ai/page.tsx:42`, `ai/analyses/[id]/page.tsx:8` | `(app)/ai.tsx:81-188`, revocar en `(tabs)/profile.tsx:66` | **Móvil no borra todo el historial** (`analyses.removeAll` sin uso; web `ai-actions.ts:76`) | Proveedor `fake` (bitácora) |
| Biométricos / Wear | `workouts.controller.ts:94,101`; tipo `packages/types/src/index.ts:500` | **Nada**: grep `biometric|heart|bpm` en `apps/web/src` = 0 | `workouts/[id].tsx:407-466`, `lib/health.ts`, `lib/wear.ts`, `modules/garfit-wear`; app Wear `apps/wear/app/src/main/java/com/garfit/app/wear/*.kt` | Web no muestra los datos del reloj aunque la API los devuelve | `PUT /workouts/:id/biometrics` 401 (bitácora) |
| Distribución APK | `releases.controller.ts:20,27,41`, CLI `cli/publish-release.ts` | — | — | Landing `AndroidDownload.astro:129-136` cae a "no disponible" | **404 `NO_RELEASE_PUBLISHED`** ✔ |

## Hallazgos priorizados

### P0

- **P0-1. No hay APK publicada en producción.** VERIFICADO: `GET /releases/latest/android` → 404 `NO_RELEASE_PUBLISHED`; `HEAD /releases/android/latest/download` → 404. La landing (`https://garfit.da-bit.cloud`, 200) muestra "Descargar para Android" pero el script la sustituye por "no disponible" (`apps/landing/src/components/AndroidDownload.astro:131-136`). Ningún workflow publica releases (`.github/workflows/ci.yml` sin `release:publish`). Bloquea el pendiente "teléfono físico desde la landing".
  → Compilar APK release apuntando a `garfit-api.da-bit.cloud` y ejecutar `release:publish` contra la instancia (volumen `garfit-demo-releases` ya existe, `docker-compose.demo.yml:37-38`).
- **P0-2 (INFERIDO, alta confianza). Carrera de refresh en móvil que revoca todas las sesiones.** `refreshSession` no tiene exclusión mutua (`apps/mobile/src/lib/auth.tsx:94-106`) y varias pantallas lanzan peticiones protegidas en paralelo (`(tabs)/index.tsx:37-41`, `(tabs)/train.tsx:29-31`, `(app)/ai.tsx:84-86`). Con access token de 900 s (`env.ts:87`), ambas reciben 401 y refrescan con el mismo token; la API trata el segundo como reutilización y ejecuta `revokeAllSessions` (`apps/api/src/auth/auth.service.ts:169-182`). Resultado: tras 15 min en segundo plano, el usuario queda deslogueado en móvil **y en web**.
  → Single-flight: guardar la promesa de refresh en curso y reutilizarla; añadir test que dispare dos 401 simultáneos. Verificar con curl + dos refrescos simultáneos antes de dar por cerrado.

### P1

- **P1-1. Sin red al abrir la app = sesión borrada.** El `catch` de `refreshSession` llama a `clearLocalSession()` ante cualquier error, incluido `NETWORK_ERROR` (`auth.tsx:102-104`), y el arranque siempre refresca (`auth.tsx:155-157`). INFERIDO.
  → Borrar la sesión sólo ante 401/`INVALID_REFRESH_TOKEN`; con error de red, conservar tokens y mostrar "sin conexión".
- **P1-2. Sin modo offline en móvil.** No hay NetInfo, caché ni cola (grep `NetInfo|offline|AsyncStorage|react-query` en `apps/mobile` sólo encuentra SecureStore). Los resultados de un entrenamiento en curso viven en estado React (`workouts/[id].tsx:57-67`); si falla el guardado o se cierra la app, se pierden. INFERIDO.
  → Persistir el borrador de resultados en almacenamiento local por `workout.id` y reintentar al recuperar red.
- **P1-3. Tests de API no ejecutables sin Docker.** VERIFICADO: `P1001: Can't reach database server at localhost:5442`; Docker Desktop no arrancado. CI sí levanta Postgres (`ci.yml:13-14`). → Anotar en el manual que `pnpm test` exige `pnpm db:up`; no es fallo de código.
- **P1-4. Móvil y Wear sin pruebas automáticas.** VERIFICADO: `apps/mobile/package.json` no tiene script `test`; `pnpm test` ejecuta 7 paquetes (api, api-client, domain, movements, types, validation, web). Wear tiene `SummaryContractTest.kt` pero no entra en turbo ni CI. → Tests unitarios de `lib/auth.tsx` y `lib/health.ts` (empezando por P0-2/P1-1).
- **P1-5. Paridad incompleta en móvil**: no edita marcas, no crea WODs, no edita borradores, no borra todo el historial IA (ver matriz). Web no muestra biométricos. INFERIDO. → Decidir si son alcance; si no, documentarlo en vez de dejarlo implícito.
- **P1-6. Google OAuth e IA real apagados en producción.** VERIFICADO `/auth/providers` → `{"local":true,"google":{"enabled":false,"webClientId":null}}`. IA `fake` según `bitacora-produccion.md:141` y `docker-compose.demo.yml:27,34` (`NODE_ENV: demo` permite `fake`; `env.ts:77-78` sólo lo prohíbe en `production`). → Pendiente externo de credenciales, sin cambio de código.

### P2

- **P2-1. Sin cabeceras de seguridad.** VERIFICADO: `/health` devuelve `x-powered-by: Express` y ninguna de HSTS / `X-Content-Type-Options` / `X-Frame-Options` / CSP. No hay `helmet` (`apps/api/src/common/setup-app.ts:11-21`). → `app.disable('x-powered-by')` + `helmet()` en `setupApp`.
- **P2-2. Promesa sin capturar al iniciar entrenamiento.** `start()` no tiene `try/catch` (`apps/mobile/src/app/(app)/workouts/[id].tsx:70-72`); un fallo de red produce rechazo no manejado sin aviso. INFERIDO. → Envolver como `save()` con `Alert`.
- **P2-3. Errores silenciados en web.** `catch {}` vacíos en `apps/web/src/app/login/page.tsx:16` y `register/page.tsx:10` (si falla `/auth/providers`, Google simplemente no aparece) y varios `.catch(() => null)` en páginas (`movements/[slug]/page.tsx:102-103`, `profile/page.tsx:26`). Aceptable como degradación, pero sin log. → Registrar el error en servidor.
- **P2-4. Límite de peticiones en memoria por instancia.** `ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] })` sin storage compartido (`apps/api/src/app.module.ts:23-24`). Correcto con una réplica; la identificación de IP tras Cloudflare/Traefik está bien resuelta (`client-ip.throttler-guard.ts:71-82`). VERIFICADO cabeceras `x-ratelimit-limit: 100`.
- **P2-5. Avisos de lint.** 6 `no-misused-spread` en mappers de API (`movement.mapper.ts:44`, `records.mapper.ts:90,122,125`, `workouts.service.ts:446`), import sin uso `cli/seed-demo.ts:11`, 2 variables sin uso en web (`ai-actions.ts:22`, `wod-builder.tsx:46`). VERIFICADO.
- **P2-6. Versión OpenAPI desfasada**: `setVersion('0.1.0')` (`setup-app.ts:27`) frente a `0.9.0-rc.1`. Swagger no está expuesto en prod (`/docs` 404, VERIFICADO), así que sólo afecta a `docs/generated/openapi/`.

Stubs/placeholders: búsqueda de `TODO|FIXME|XXX|HACK|not implemented|placeholder|stub|mock` en `apps/*/src`, `packages/*/src` y Wear: **ningún stub real**. Sólo aparecen la palabra española "todo", props `placeholder` de inputs y `export-openapi.ts:14` (secreto ficticio legítimo para exportar el esquema). `FakeAiProvider` es productivo pero seleccionable sólo por entorno (`ai.module.ts:28`) y bloqueado en `production` (`env.ts:77`). INFERIDO.

## Resultados de comandos (VERIFICADO)

| Comando | Resultado | Tiempo |
| --- | --- | --- |
| `pnpm typecheck` | EXIT 0 · 11/11 tareas (10 en caché turbo) · landing `astro check` 0 errores | 34 s |
| `pnpm lint` | EXIT 0 · 11/11 · 0 errores, 8 avisos (6 API oxlint, 2 web eslint) | 44 s |
| `pnpm test` | **EXIT 1** · 8/9 tareas OK; falla `@garfit/api:test` en `prisma migrate deploy`: `P1001 Can't reach database server at localhost:5442` (Docker no arrancado: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`) | 36 s |

Tests que sí corrieron: api-client 19, domain 84, movements 10, validation 15, web 39 → **167 pasan, 0 fallan**. API (29 ficheros en `apps/api/test`) no ejecutada por entorno.

Producción (sólo GET/HEAD, `curl --max-time 20`):

| Petición | HTTP | Latencia total | Respuesta |
| --- | --- | --- | --- |
| `GET /health` | 200 | 0,29 s | `{"status":"ok","database":"up","version":"0.9.0-rc.1"}` |
| `GET /auth/providers` | 200 | 0,21 s | `local:true`, `google.enabled:false` |
| `GET /releases/latest/android` | **404** | 0,22 s | `NO_RELEASE_PUBLISHED` |
| `HEAD /releases/android/latest/download` | **404** | 0,33 s | JSON 102 B |
| `GET /movements` | 200 | 0,39 s | 5,4 KB, paginado |
| `GET /movements?limit=1` | 200 | 0,33 s | `total:1326` |
| `GET /wods`, `GET /auth/me` | 401 | 0,21 / 0,32 s | `UNAUTHORIZED` (guard OK) |
| `GET /docs`, `/docs-json`, `/nonexistent` | 404 | 0,23–0,38 s | Filtro de errores uniforme `{statusCode,code,message}` |
| `GET https://garfit.da-bit.cloud` (landing) | 200 | 0,21 s | Contiene "Descargar para Android" |
| `GET https://garfit-app.da-bit.cloud` (web) | 307 → `/login` 200 | 0,23 / 0,40 s | — |

## Deuda documentada vs real

| Deuda en documentos | Fuente | Estado en código hoy |
| --- | --- | --- |
| "Creación de WOD personal ausente de web" | `12-trabajo-futuro.md:57` | **Resuelta en web** (`apps/web/src/app/wod-actions.ts:33`, `app/wods/new/page.tsx`); ahora falta en **móvil**. Doc desfasado. |
| "Snapshot sin endpoint" | `12-trabajo-futuro.md:55,57` | **Resuelta**: `POST /ai/analyze/progress` (`ai.controller.ts:73`) usa `ProgressSnapshotService`. Doc desfasado. |
| "Falta de historial" de IA | `12-trabajo-futuro.md:68` | **Resuelta**: `GET/DELETE /ai/analyses` (`ai.controller.ts:30-45`) en web y móvil. |
| Wearables "fuera de alcance" | `12-trabajo-futuro.md:74` | **Contradicción**: biométricos y app Wear implementados (ADR 0011, `workouts.controller.ts:94`, `apps/wear/`). El capítulo debe actualizarse. |
| Límite de IA por instancia | `12-trabajo-futuro.md:68` | Sigue viva: cuota de IA y throttler global en memoria (`app.module.ts:23-24`). |
| E2E móvil (Maestro/Detox) | `12-trabajo-futuro.md:43` | Sigue viva y peor: móvil no tiene **ningún** test (sin script `test`). |
| Cobertura unitaria web baja | `12-trabajo-futuro.md:57,68` | Mejorada (8 ficheros, 39 tests), sin métrica nueva hoy. |
| Google OAuth sin credenciales | `PENDIENTES-EXTERNOS.md:22-30`, `CHECKLIST.md:123` | **Sigue viva**, VERIFICADO en prod. |
| Gemini real | `PENDIENTES-EXTERNOS.md:12-20`, `CHECKLIST.md:122` | Sigue viva (prod `fake` según bitácora; no verificable sin sesión). |
| Teléfono físico desde la landing | `PENDIENTES-EXTERNOS.md:32-40`, `CHECKLIST.md:125`, `bitacora-produccion.md:192` | Sigue viva y **ahora bloqueada**: no hay release publicada (P0-1). `CHECKLIST.md:105` ("APK trazable") es histórico, no estado actual. |
| Traefik acepta tráfico directo a la IP | `bitacora-produccion.md:190-191` | Sigue viva (infra). El throttler no se deja falsear por ese camino (`client-ip.throttler-guard.ts:68-81`). |
| Copias de PostgreSQL | `bitacora-produccion.md:166-171` | Descartado por decisión; no es deuda. |
| "Última comprobación: 2026-09-18" | `PENDIENTES-EXTERNOS.md:5` | Fecha de cabecera desfasada (el cuerpo ya cita el emulador del 2026-10-27). |
| `PENDIENTES-EXTERNOS.md` en la raíz | brief de la tarea | No existe en la raíz; vive en `docs/academic/PENDIENTES-EXTERNOS.md`. |

No documentado en ninguna parte y real: P0-2 (carrera de refresh), P1-1 (logout sin red), P2-1 (cabeceras), paridad móvil de P1-5, ausencia de biométricos en web.
