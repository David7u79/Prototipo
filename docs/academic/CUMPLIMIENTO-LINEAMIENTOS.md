# Cumplimiento de lineamientos para prototipo de titulación

La matriz relaciona los tres momentos exigidos con evidencia localizada. El estado no sustituye trámites institucionales ni evaluación con personas usuarias.

| Etapa exigida | Documento y sección | Evidencia verificable | Estado |
| --- | --- | --- | --- |
| 1. Estudio de factibilidad | [4. Estudio de factibilidad](04-estudio-de-factibilidad.md), secciones 4.1 a 4.10 | Requisitos de entorno y dependencias en [manual, 11.1–11.3](11-manual-de-operacion.md); decisiones en [ADR 0001–0010](../adr/README.md). La parte económica declara recursos gratuitos sólo durante el prototipo y no inventa precios. | COMPLETO |
| 2. Construcción y verificación de funcionamiento | [8. Implementación](08-implementacion.md), [9. Pruebas y verificación](09-pruebas-y-verificacion.md), [10. Resultados](10-resultados.md) | 287 pruebas, siete recorridos Playwright, 35 rutas OpenAPI con esquema en cada 2xx; pruebas en `apps/api/test/`, `packages/*/src/*.test.ts` y `apps/web/e2e/`; capturas en `docs/evidence/fase-5/capturas/`. | PENDIENTE: Gemini real, OAuth real e instalación Android física dependen de tercero, credenciales o dispositivo; véase [Pendientes externos](PENDIENTES-EXTERNOS.md). |
| 3. Presentación respaldada por manual de operación | [11. Manual de operación](11-manual-de-operacion.md), secciones 11.1–11.10; [entrega](../delivery/README.md) | Manual de registro, sesión, perfil, movimientos, marcas, WODs, entrenamientos, historial, progreso, IA, evidencia, historial de análisis, descarga e instalación; diagramas y capturas enlazados. | COMPLETO para el material técnico. PENDIENTE para datos administrativos, autorización y asesoría, que corresponden a la persona responsable. |

El hueco real de la etapa 2 no se compensa con pruebas simuladas: éstas acreditan el contrato y el flujo local, no una credencial real ni la ejecución en hardware.

## Lectura de la matriz

Esta matriz permite al sínodo comprobar cada afirmación en el worktree. Los estados
describen únicamente el alcance académico acreditable: una prueba local no sustituye
una autorización institucional ni convierte un proveedor externo en disponible.

| Etapa | Exigencia sintetizada | Cobertura documental | Estado acreditable |
| --- | --- | --- | --- |
| 1. Factibilidad | Determinar si el prototipo es realizable con recursos, riesgos y límites identificables. | [Capítulo 4, secciones 4.1–4.10](04-estudio-de-factibilidad.md) y [ADR 0001–0010](../adr/README.md). | COMPLETO con límites declarados. |
| 2. Construcción y verificación | Construir el prototipo y contrastar sus recorridos y contratos mediante pruebas. | [Capítulos 8–10](08-implementacion.md) y [secciones 9.1–9.7](09-pruebas-y-verificacion.md). | COMPLETO localmente; pendientes externos identificados. |
| 3. Presentación y manual | Presentar una demostración respaldada por instrucciones y evidencia localizable. | [Manual, secciones 11.1–11.10](11-manual-de-operacion.md) e [índice de entrega](../delivery/README.md). | COMPLETO para material técnico. |

## Etapa 1. Estudio de factibilidad

**Qué exige.** Justificar que el prototipo puede realizarse y reconocer los recursos,
dependencias, riesgos y límites que condicionan su uso.

**Documento y sección.** El [capítulo 4, secciones 4.1 a 4.10](04-estudio-de-factibilidad.md)
cubre factibilidad técnica, operativa, económica, legal, ética, IA y distribución.
Las decisiones que la sustentan están en [ADR 0001–0010](../adr/README.md).

**Evidencia verificable.** [`docs/generated/BUILD_INFO.md`](../generated/BUILD_INFO.md)
registra versiones, entorno y migración; [la arquitectura final](../architecture/final-architecture.md)
y el [ERD](../generated/database/erd.svg) muestran dependencias y datos. Ejecute
`pnpm docs:check` para derivar y comprobar OpenAPI, ERD y TypeDoc, y
`pnpm version:check` para validar la versión declarada.

**Estado.** COMPLETO para el estudio documental del prototipo. Las cotizaciones, el
aviso de privacidad y la operación productiva siguen explícitamente pendientes en
las secciones 4.2–4.4; no se presentan como resultados logrados.

## Etapa 2. Construcción y verificación de funcionamiento

**Qué exige.** Implementar el prototipo y demostrar con pruebas, contratos, datos y
recorridos de usuario que sus comportamientos dentro del alcance funcionan.

**Documento y sección.** La construcción está descrita en el [capítulo 8](08-implementacion.md),
la estrategia e inventario en [9.1–9.7](09-pruebas-y-verificacion.md) y los resultados
en el [capítulo 10](10-resultados.md). El [capítulo 7](07-modelo-de-datos.md) y el
[ERD generado](../generated/database/erd.svg) respaldan la persistencia.

**Pruebas reproducibles.** Las integraciones de API viven en `apps/api/test/`; las
unitarias y de contrato en `packages/*/src/*.test.ts` y la web; los E2E de Chromium en
`apps/web/e2e/`. Con PostgreSQL de pruebas disponible, ejecute `pnpm test`,
`pnpm test:coverage` y `pnpm evidence:web`. El manual, secciones 11.1–11.3, define el
entorno y la semilla necesarios.

**Artefactos verificables.** El contrato HTTP está en
[`docs/generated/openapi/openapi.yaml`](../generated/openapi/openapi.yaml) y
[`openapi.json`](../generated/openapi/openapi.json); la cobertura en
[`docs/generated/coverage/SUMMARY.md`](../generated/coverage/SUMMARY.md); y el corte
de generación en [`BUILD_INFO.md`](../generated/BUILD_INFO.md). `pnpm docs:check`
comprueba que los derivados versionados corresponden al código, y
`pnpm docs:check-openapi` revisa respuestas 2xx con esquema.

**Capturas e informes.** Los informes fechados están en `docs/evidence/fase-1/` a
`docs/evidence/fase-5/`. Las capturas permanentes se encuentran en las subcarpetas
`capturas/` de fases 2 a 5: fase 2 para registro y marcas, fase 3 para entrenamientos,
fase 4 para consentimiento e IA, y fase 5 para historial, comparaciones y Android.
`pnpm evidence:web` produce evidencia local nueva sin sustituir los cortes históricos.

**Métricas del atleta.** Conversiones, series comparables, cambios y progreso se
calculan determinísticamente. La evidencia está en `packages/domain/src/` y en
`apps/api/test/records.spec.ts`, pruebas de entrenamientos y de progreso; las capturas
de fases 3 y 5 muestran el resultado en interfaz. Véase también
[la matriz de trazabilidad](../TRACEABILITY.md).

**IA sin fuente de verdad.** [El flujo de IA](../architecture/ai-flow.md) y
[ADR 0009](../adr/0009-ai-analysis-architecture.md) establecen que GarFit calcula
hechos y `AiProvider` sólo los interpreta. `apps/api/test/ai.spec.ts` y
`apps/api/test/ai-validation.spec.ts`, junto con `docs/evidence/fase-4/capturas/`,
comprueban el proveedor simulado, consentimiento y evidencia. `pnpm test:gemini`
comprueba el estado de llamada real sin exponer una clave.

**APK y manifiesto.** La evidencia de compilación, publicación, descarga y checksum
está en [distribución Android](../evidence/fase-5/distribucion-android.md). El
manifiesto es [`package.json`](../../package.json) y `pnpm version:check` lo valida.
El APK no se guarda en Git: se genera con `pnpm --filter @garfit/mobile exec expo prebuild --platform android --clean`,
después `./gradlew assembleRelease` en `apps/mobile/android`, y se publica con
`pnpm --filter @garfit/api release:publish -- --file <apk> --version <versión> --version-code <código> --changelog <nota>`.
La CLI calcula tamaño y SHA-256 sobre el archivo real.

**Estado.** COMPLETO para construcción y verificación automatizada/local. PENDIENTE
para Gemini real, Google OAuth real e instalación Android física, pues cada caso
depende de credencial, configuración o dispositivo externo.

## Etapa 3. Presentación respaldada por manual de operación

**Qué exige.** Ofrecer una demostración que pueda seguirse mediante instrucciones de
operación y que enlace sus acciones con evidencia técnica.

**Documento y sección.** El [manual, secciones 11.1–11.10](11-manual-de-operacion.md)
describe requisitos, instalación, servicios, registro, perfil, marcas, entrenamientos,
WOD, progreso, IA, historial y descarga. El [índice de entrega](../delivery/README.md)
localiza los documentos, diagramas, artefactos y evidencia de apoyo.

**Evidencia verificable.** Las capturas por fase son las rutas indicadas en la etapa 2;
los informes `pruebas-AAAA-MM-DD.md` de cada fase identifican su corte. Tras preparar
el entorno con 11.1–11.3, `pnpm evidence:web` permite reproducir la demostración web.
Para los artefactos de presentación ejecute además `pnpm docs:check`.

**Estado.** COMPLETO para manual técnico y demostración reproducible en el entorno
documentado. PENDIENTE para portadas, firmas y autorizaciones, pues dependen de las
personas e institución responsables.

## Preguntas de la definición de terminado

### ¿Se estudió la factibilidad?

Sí. El [capítulo 4, secciones 4.1–4.10](04-estudio-de-factibilidad.md) cubre las
dimensiones aplicables y `pnpm docs:check` permite comprobar los derivados técnicos.

### ¿Se construyó un prototipo funcional?

Sí, dentro del alcance local. El [capítulo 8](08-implementacion.md), `apps/` y
`packages/` contienen la implementación; `pnpm build` la compila y `pnpm dev` inicia
API, web y landing después de preparar la base como indica el manual.

### ¿Se verificó su funcionamiento?

Sí. Ejecute `pnpm test`, `pnpm test:coverage`, `pnpm evidence:web`, `pnpm docs:check`
y `pnpm docs:check-openapi`; los resultados históricos se conservan en
`docs/evidence/fase-1/` a `docs/evidence/fase-5/`.

### ¿Existe manual de operación?

Sí. El [capítulo 11, secciones 11.1–11.10](11-manual-de-operacion.md) cubre la
preparación, uso, análisis y comprobación de descarga Android.

### ¿La demostración es reproducible?

Sí para el entorno local: `pnpm install`, `pnpm db:up`, `pnpm db:migrate`,
`pnpm db:seed`, `pnpm evidence:web` y `pnpm docs:check` siguen un orden reproducible.
Requieren Node, pnpm, Docker, PostgreSQL y Chromium como documenta el manual.

### ¿Existen web, móvil y APK?

Sí: web en `apps/web/`, móvil en `apps/mobile/` y evidencia de APK compilada/publicada
en [fase 5](../evidence/fase-5/distribucion-android.md). El binario se referencia por
versión y SHA-256 porque no se versiona; su instalación física sigue pendiente.

### ¿Los datos del atleta generan métricas reales?

Sí, como cálculos deterministas sobre registros del prototipo, no como medición clínica.
Las pruebas de dominio/API y las capturas de fases 3 y 5 acreditan conversiones,
comparaciones, volumen y progreso.

### ¿La IA interpreta sin ser fuente de verdad?

Sí. La arquitectura de IA y las pruebas `apps/api/test/ai-validation.spec.ts` muestran
que los hechos se calculan y validan antes de la interpretación; la llamada real es
un control externo pendiente.

### ¿Hay evidencia de las afirmaciones principales?

Sí para las afirmaciones locales: pruebas, OpenAPI, ERD, cobertura, informes y capturas
se enlazan aquí y en el [índice de entrega](../delivery/README.md).

## Huecos reales

No se puede acreditar Gemini real sin una `GEMINI_API_KEY` autorizada, Google OAuth
sin credenciales y configuración de clientes, ni instalación y recorrido Android sin
teléfono o emulador. El proveedor simulado, los contratos y la APK descargada no
sustituyen esas verificaciones. Los requisitos, preparación y estado de cada caso se
declaran sin maquillarlos en [Pendientes externos](PENDIENTES-EXTERNOS.md).
