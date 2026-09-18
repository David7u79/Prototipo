# Matriz de trazabilidad

## 0. Requerimientos implementados (Fase 3)

| Requerimiento | Implementación concreta (rutas) | Prueba automatizada (`fichero › describe › it`) | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-13 | `apps/api/src/workouts/workouts.service.ts`; `apps/api/src/workouts/workouts.controller.ts` | `apps/api/test/workouts.spec.ts › workouts › crea libre conservando orden y objetivos` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RF-14 | `apps/api/src/workouts/workouts.service.ts`; `apps/api/src/wods/wods.service.ts` | `apps/api/test/workouts.spec.ts › workouts › crea desde WOD copiando prescripción y rechaza WOD inexistente` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RF-15 | `apps/api/src/workouts/workouts.service.ts`; `packages/domain/src/workouts.ts` | `apps/api/test/workouts.spec.ts › workouts › reemplaza ejercicios en draft, inicia y bloquea PATCH en progreso` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RF-16 | `apps/api/src/workouts/workouts.service.ts`; `packages/domain/src/workouts.ts` | `apps/api/test/workouts.spec.ts › workouts › guarda resultados canónicos y valida score, ejercicio, duplicados y límite de series` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RF-17 | `apps/api/src/workouts/workouts.service.ts`; `apps/web/src/app/app/workouts/[id]/page.tsx` | `apps/api/test/workouts.smoke.spec.ts › workouts smoke › no completa FOR_TIME sin score` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md); capturas 13 y 14 |
| RF-18 | `apps/api/src/records/records.service.ts`; `packages/domain/src/workouts.ts` | `apps/api/test/workout-records.spec.ts › marcas derivadas de workouts › crea 1RM, informa cambio y no registra empates o regresiones` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md); captura 15 |
| RF-19 | `apps/api/src/workouts/workouts.service.ts`; `apps/web/src/app/app/workouts/page.tsx` | `apps/api/test/workout-stats.spec.ts › GET /workouts/stats › calcula ventanas, último, volumen y omite drafts y borrados` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md); capturas 16 y 17 |
| RF-20 | `apps/api/src/wods/wods.service.ts`; `apps/web/src/app/app/wods/page.tsx` | `apps/api/test/wods.spec.ts › WODs › crea WOD privado, lo aísla y devuelve 404 a otro atleta` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RF-21 | `packages/domain/src/records.ts`; `apps/api/src/records/records.service.ts` | `apps/api/test/workout-records.spec.ts › marcas derivadas de workouts › crea TIME y DISTANCE para cardio, separando 5k y 10k` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RF-22 | `apps/web/src/app/app/workouts/`; `apps/mobile/src/app/(app)/workouts/` | `apps/web/e2e/workout-flow.spec.ts › athlete-flow workout-flow` | Pasa en web; móvil PENDIENTE | [fase 3](evidence/fase-3/pruebas-2026-09-17.md); capturas 10 a 17 |
| RNF-13 | `apps/api/src/workouts/workouts.service.ts` | `apps/api/test/workout-records.spec.ts › marcas derivadas de workouts › es idempotente y serializa completados concurrentes` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RNF-14 | `apps/api/src/workouts/workouts.service.ts` | `apps/api/test/workouts.smoke.spec.ts › workouts smoke › completar dos veces en paralelo crea una sola marca` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RNF-15 | `apps/api/src/workouts/workouts.service.ts`; `apps/api/src/records/records.service.ts` | `apps/api/test/records.spec.ts › marcas personales › PATCH /records/:id › no permite modificar ni borrar una marca derivada y expone su origen` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RNF-16 | `packages/domain/src/workouts.ts`; `packages/domain/src/progress-snapshot.ts` | `packages/domain/src/workouts.test.ts › marcas y ventanas › deriva candidatos y conserva la primera serie empatada` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |
| RNF-17 | `packages/domain/src/rules.ts`; `apps/api/src/workouts/dto/workout.dto.ts` | `apps/api/test/workouts.spec.ts › workouts › rechaza movimiento inválido, campos extra y más de treinta ejercicios` | Pasa | [fase 3](evidence/fase-3/pruebas-2026-09-17.md) |

La evidencia formal de ejecución se encuentra documentada en los informes inmutables por fase:
- [Pruebas de fase 1](evidence/fase-1/pruebas-2026-09-16.md)
- [Pruebas de fase 2](evidence/fase-2/pruebas-2026-09-16.md) y [capturas del flujo E2E](evidence/fase-2/capturas/)

## 1. Requerimientos implementados (Fase 1 y Fase 2)

| Requerimiento | Implementación concreta (rutas) | Prueba automatizada (`fichero › describe › it`) | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-01 | `apps/api/src/auth/auth.service.ts`; `apps/api/src/auth/auth.controller.ts` | `apps/api/test/auth.spec.ts › autenticación local › registra el usuario normalizado y devuelve tokens seguros` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RF-02 | `apps/api/src/auth/google-identity.verifier.ts`; `apps/api/src/auth/auth.service.ts` | `apps/api/test/google-auth.spec.ts › POST /auth/google › crea y reutiliza la cuenta Google del mismo sub` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RF-03 | `apps/api/src/profile/profile.controller.ts`; `apps/api/src/profile/profile.service.ts` | `apps/api/test/profile.spec.ts › GET y PUT /profile › crea, consulta y actualiza el mismo perfil` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RF-04 | `apps/api/src/releases/releases.controller.ts`; `apps/api/src/releases/storage/local-release-storage.ts` | `apps/api/test/releases.spec.ts › releases Android › descarga el APK publicado con cabeceras y bytes correctos` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RF-05 | `apps/api/src/movements/movements.controller.ts`; `apps/api/src/movements/movements.service.ts`; `apps/web/src/app/app/movements/page.tsx` | `apps/api/test/movements.spec.ts › catálogo de movimientos › GET /movements › lista sólo movimientos activos, ordenados por nombre, con el contrato MovementSummary` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); [captura 04](evidence/fase-2/capturas/04-movements.png) |
| RF-06 | `apps/api/src/movements/movements.controller.ts`; `apps/web/src/app/app/movements/[slug]/page.tsx`; `apps/mobile/src/app/(app)/movements/[slug].tsx` | `apps/api/test/movements.spec.ts › catálogo de movimientos › GET /movements/:slug › devuelve el detalle con instrucciones y fuente` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); [captura 05](evidence/fase-2/capturas/05-movement-detail.png) |
| RF-07 | `apps/api/src/records/records.controller.ts`; `apps/api/src/records/records.service.ts`; `apps/web/src/app/app/records/new/page.tsx` | `apps/api/test/records.spec.ts › marcas personales › POST /records › registra una marca de peso en kg` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); [captura 06](evidence/fase-2/capturas/06-record-form.png) |
| RF-08 | `apps/api/src/records/records.controller.ts`; `apps/api/src/records/records.service.ts`; `apps/web/src/app/app/records/[movementSlug]/[id]/edit/page.tsx` | `apps/api/test/records.spec.ts › marcas personales › PATCH /records/:id › corrige valor y unidad recalculando normalizedValue` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RF-09 | `apps/api/src/records/records.controller.ts`; `packages/domain/src/records.ts`; `apps/web/src/app/app/records/[movementSlug]/page.tsx` | `apps/api/test/records.spec.ts › marcas personales › historial y progreso › ordena cronológicamente y calcula mejor, actual y cambios exactos` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); [captura 07](evidence/fase-2/capturas/07-records.png); [captura 08](evidence/fase-2/capturas/08-record-history.png) |
| RF-10 | `apps/api/src/records/records.controller.ts`; `apps/web/src/app/app/page.tsx`; `apps/mobile/src/app/(app)/(tabs)/index.tsx` | `apps/api/test/records.spec.ts › marcas personales › GET /records y GET /records/summary › resume series por actividad reciente y la mejora más reciente` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); [captura 02](evidence/fase-2/capturas/02-dashboard-empty.png); [captura 09](evidence/fase-2/capturas/09-dashboard.png) |
| RF-11 | `apps/api/src/profile/profile.service.ts`; `packages/domain/src/rules.ts`; `apps/web/src/app/app/profile/page.tsx` | `apps/api/test/profile-extended.spec.ts › perfil deportivo ampliado › guarda unidades, fechas y medidas con sus tipos` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); [captura 03](evidence/fase-2/capturas/03-profile.png) |
| RF-12 | `apps/web/src/app/app/**`; `apps/mobile/src/app/(app)/**` | `apps/web/e2e/athlete-flow.spec.ts › atleta registra y consulta sus marcas` | Pasa en web; Móvil PENDIENTE en dispositivo | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md); capturas `01` a `09` |
| RNF-01 | `apps/web/src/lib/auth.ts`; `apps/mobile/src/lib/auth.tsx` | `apps/web/src/lib/auth-utils.test.ts › safeNext, authErrorMessage › only accepts local app routes` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RNF-02 | `apps/api/src/auth/auth.service.ts` | `apps/api/test/auth.spec.ts › autenticación local › rota refresh, rechaza el anterior y revoca sesiones al reutilizarlo` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RNF-03 | `packages/types`; `packages/validation`; `packages/api-client` | `packages/validation/src/index.test.ts › esquemas de validación › acepta registro y normaliza el correo` | Pasa | [pruebas fase 1](evidence/fase-1/pruebas-2026-09-16.md) |
| RNF-04 | `scripts/docs/generate.mjs` | `node scripts/docs/generate.mjs --check` | Pasa | verificación automatizada en CI |
| RNF-05 | `apps/api/src/ai/gemini-ai.provider.ts` | Sin prueba automatizada específica | PENDIENTE de prueba automatizada | revisión arquitectónica de código |
| RNF-06 | `packages/domain/src/units.ts`; `apps/api/src/records/records.service.ts` | `packages/domain/src/units.test.ts › toCanonical y fromCanonical › convierte libras a kg con la definición internacional y 3 decimales` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RNF-07 | `packages/domain/src/records.ts`; `packages/domain/src/progress-snapshot.ts` | `packages/domain/src/records.test.ts › summarizeSeries › ordena por fecha y calcula mejor, actual, cambios y marcas personales` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RNF-08 | `apps/api/src/records/records.service.ts`; `apps/api/src/profile/profile.service.ts` | `apps/api/test/records-isolation.spec.ts › aislamiento de marcas entre usuarios › otro usuario no ve las marcas en overview, summary ni historial` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RNF-09 | `apps/api/prisma/schema.prisma` (`PersonalRecord.deletedAt`); `apps/api/src/records/records.service.ts` | `apps/api/test/records.spec.ts › marcas personales › DELETE /records/:id (borrado lógico) › retira la marca de historial, overview y summary pero conserva la fila` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RNF-10 | `packages/domain/src/rules.ts`; `apps/api/src/records/dto/record.dto.ts`; `apps/api/src/movements/dto/movement.dto.ts` | `apps/api/test/records.spec.ts › marcas personales › POST /records › rechaza valores no positivos, con más de 3 decimales o fuera de límites` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RNF-11 | `packages/domain/src/rules.ts`; `packages/movements/src/taxonomy.ts` | `apps/api/test/shared-enums.spec.ts › enums compartidos › coinciden con Prisma` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |
| RNF-12 | `packages/movements/src/source-transform.ts`; `apps/api/src/movements/seed/seed-movements.ts` | `packages/movements/src/movements.test.ts › catálogo generado (datos reales) › corresponde a la fuente fijada y tiene 1319 movimientos con slugs únicos` | Pasa | [pruebas fase 2](evidence/fase-2/pruebas-2026-09-16.md) |

## 2. Requerimientos históricos de fase 3 (estado actualizado al cierre)

La tabla conserva la formulación de fase 2; la columna de estado se actualiza al cierre del release candidate para evitar que se interprete como alcance pendiente.

| Requerimiento | Descripción | Estado | Justificación |
| --- | --- | --- | --- |
| RF-13 | Catálogo y definición de rutinas y entrenamientos estructurados (`Workout`, `WorkoutExercise`, WODs). | Implementado | Véanse las filas RF-13 a RF-17 de la sección 0, con código y pruebas actuales. |
| RF-14 | Registro de sesiones ejecutadas y resultados de entrenamiento (`WorkoutResult`). | Implementado | Véanse las filas RF-13 a RF-17 de la sección 0, con código y pruebas actuales. |
| RF-15 | Generación automática de marcas personales derivadas de resultados de entrenamiento (`source: WORKOUT`). | Implementado | Véanse RF-18 y RNF-13 a RNF-16 de la sección 0. |
| RF-16 | Asistente conversacional deportivo inteligente con Google Gemini para interpretación de progreso. | Fuera del alcance actual | GarFit implementa análisis acotados con evidencia, no un chat contextual; la prueba real con Gemini depende de una clave externa. |

## 3. Requerimientos implementados (Fase 4: IA)

| Requerimiento | Implementación concreta (rutas) | Prueba automatizada (`fichero › describe › it`) | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-18 | `apps/api/src/ai/ai.controller.ts`; `POST /ai/consent`; `DELETE /ai/consent` | `apps/api/test/ai.spec.ts › IA: estado, consentimiento y operaciones › conserva la fecha al consentir y permite revocarla` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md); captura de consentimiento |
| RF-19 | `POST /ai/analyze/progress`; `POST /ai/analyze/workout/:workoutId` | `apps/api/test/ai.spec.ts › IA: estado, consentimiento y operaciones › analiza progreso con hechos resueltos y datos usados` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md); capturas de progreso y entrenamiento |
| RF-20 | `POST /ai/explain/wod/:slug`; `POST /ai/explain/movement/:slug`; `apps/web/src/app/app/wods/new/page.tsx` | `apps/api/test/ai.spec.ts › IA: estado, consentimiento y operaciones › explica WODs benchmark y movimientos del catálogo` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md); capturas de WOD, movimiento y creación |
| RF-21 | `GET /ai/status`; `apps/web/src/components/ai-analysis.tsx` | `apps/api/test/ai.spec.ts › IA: estado, consentimiento y operaciones › expone estado sin filtrar credenciales` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md); capturas de panel y evidencia |
| RNF-18 | `packages/domain/src/ai.ts`; `packages/validation/src/index.ts`; `apps/api/src/ai/ai.service.ts` | `apps/api/test/ai-validation.spec.ts › IA: validación, disponibilidad y caché › rechaza salidas que incumplen el esquema` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md) |
| RNF-19 | `apps/api/src/ai/ai.service.ts`; `packages/domain/src/ai.ts` | `apps/api/test/ai-security.spec.ts › IA: aislamiento y contenido seguro › trata notas inyectadas como datos y minimiza el contexto` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md) |
| RNF-20 | `apps/api/src/ai/gemini-ai.provider.ts`; `apps/api/src/ai/ai.service.ts` | `apps/api/test/ai-validation.spec.ts › IA: validación, disponibilidad y caché › reutiliza el análisis idéntico sin invocar de nuevo al proveedor` | Pasa | [fase 4](evidence/fase-4/pruebas-2026-09-17.md) |

Las filas de fase 4 se verificaron contra los títulos de pruebas existentes. El proveedor simulado permite que las pruebas y las capturas sean reproducibles sin red; la integración con Gemini real se mantiene marcada como PENDIENTE en la evidencia.

## 4. Requerimientos implementados (Fase 5)

| Requerimiento | Implementación concreta (rutas) | Prueba automatizada (`fichero › describe › it`) | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-22 | `apps/api/src/ai/ai.controller.ts`; `apps/api/src/ai/ai.service.ts` | `apps/api/test/ai-history.spec.ts › historial de análisis de IA › lista análisis con etiquetas, orden, paginación y filtro` | Pasa | [fase 5](evidence/fase-5/pruebas-2026-09-17.md) |
| RF-23 | `apps/api/src/ai/ai.service.ts` | `apps/api/test/ai-history.spec.ts › historial de análisis de IA › borra únicamente el historial autenticado y conserva lo previo al revocar consentimiento` | Pasa | [fase 5](evidence/fase-5/pruebas-2026-09-17.md) |
| RF-24 | `apps/api/src/wods/wods.service.ts`; `packages/domain/src/comparisons.ts` | `apps/api/test/wod-performance.spec.ts › rendimiento por WOD › calcula mejor, última y cambio entre intentos FOR_TIME` | Pasa | [fase 5](evidence/fase-5/pruebas-2026-09-17.md) |
| RF-25 | `packages/domain/src/comparisons.ts`; `apps/api/src/workouts/workouts.service.ts` | `packages/domain/src/comparisons.test.ts › comparación entre periodos › separa las ventanas actual y anterior de 30 días` | Pasa | [fase 5](evidence/fase-5/pruebas-2026-09-17.md) |
| RF-26 | `apps/api/src/releases/releases.controller.ts`; `apps/api/src/releases` | `apps/api/test/releases.spec.ts › releases Android › descarga la última publicada y no sirve borradores como última` | Pasa | [fase 5](evidence/fase-5/pruebas-2026-09-17.md) |
| RNF-21 | `apps/landing/src/components/AndroidDownload.astro`; `apps/api/src/releases/releases.controller.ts` | `apps/web/e2e/landing-download.spec.ts › descarga y metadatos de la release Android` | Pasa | [fase 5](evidence/fase-5/pruebas-2026-09-17.md) |
| RNF-22 | `apps/api/src/cli/gemini-smoke.ts` | `pnpm test:gemini` | PENDIENTE: `GEMINI_API_KEY` no configurada | [Gemini real](evidence/fase-5/gemini-real.md) |
