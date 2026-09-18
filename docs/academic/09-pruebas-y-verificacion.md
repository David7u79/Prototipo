# 9. Pruebas y verificación

## 9.1 Estrategia y pirámide de pruebas

La estrategia de verificación de GarFit responde a un enfoque multinivel diseñado para validar la integridad del sistema desde las reglas matemáticas básicas hasta los flujos completos de interacción del usuario:

1. **Pruebas unitarias de dominio y transformaciones:** Ubicadas en los paquetes compartidos (`@garfit/domain`, `@garfit/movements`, `@garfit/validation`, `@garfit/api-client`) y bibliotecas de cliente (`apps/web/src/lib`). Evalúan funciones matemáticas puras, conversión de unidades, parseo de filtros, cálculo de progresos y renderizado de geometrías de gráficas SVG, ejecutándose en milisegundos sin requerir servicios externos ni red.
2. **Pruebas de integración HTTP contra base de datos real:** Ubicadas en `apps/api/test/`. Inician una instancia completa de la aplicación NestJS mediante `createTestApp` y efectúan peticiones HTTP a través de Supertest. La persistencia opera contra una base de datos PostgreSQL real dedicada exclusivamente a pruebas (`garfit_test` en puerto `5442`). La función `resetDatabase` purga todas las tablas del esquema antes de cada escenario, garantizando aislamiento estricto y repetibilidad.
3. **Pruebas de extremo a extremo (E2E con Playwright):** Implementadas en `apps/web/e2e/`. Ejecutan un navegador Chromium automatizado sobre las versiones de producción compiladas de la API y la aplicación web, validando la interacción real del atleta: llenado de formularios, navegación perimetral protegida, sembrado del catálogo, cálculo de marcas y captura inmutable de evidencias visuales.

## 9.2 Inventario consolidado de pruebas

El inventario inicial de esta sección corresponde a su corte histórico. El cierre funcional verificó 287 pruebas: API 129, dominio 76, web 39, cliente API 19, validación 14 y movimientos 10; los detalles y las siete rutas E2E constan en la sección 9.7 y en el capítulo 10.

| Fichero de prueba | Componente / Suite (`describe`) | Escenarios evaluados (`it`) |
| --- | --- | --- |
| `apps/api/test/auth.spec.ts` | Autenticación local | Registro con correo normalizado, hash Argon2id, rechazo de correo duplicado, validación de contraseñas, login con credenciales válidas e inválidas, endpoint `me`, rotación y revocación de tokens de refresco, expiración y cierre de sesión. |
| `apps/api/test/google-auth.spec.ts` | Autenticación con Google | Verificación de configuración, rechazo de tokens inválidos o correos no verificados, vinculación por `sub` de Google y coexistencia con cuentas locales. |
| `apps/api/test/health.spec.ts` | Salud del sistema | Respuesta satisfactoria del endpoint `GET /health` con PostgreSQL disponible. |
| `apps/api/test/profile.spec.ts` | Perfil básico | Exigencia de token Bearer, creación, consulta y actualización del perfil, validación de enumeraciones y aislamiento entre atletas. |
| `apps/api/test/profile-extended.spec.ts` | Perfil deportivo ampliado | Persistencia de campos opcionales ausentes como `null`, sistema métrico por defecto, validación de tipos en fechas y medidas, sustitución íntegra en `PUT`, rechazo de fechas futuras, edades fuera de rango (5 a 120 años), inconsistencias de fechas (`trainingSince < birthDate`) y rechazo de campos no tipificados. |
| `apps/api/test/movements.spec.ts` | Catálogo de movimientos | `GET /movements`: listado exclusivo de movimientos activos con contrato `MovementSummary`, paginación exacta (`page` y `limit`), cálculo de `totalPages`, búsqueda de texto insensible a mayúsculas, filtros por categoría, equipo, tipo de marca, dificultad y músculos, combinación de filtros con AND lógico y rechazo de parámetros no reconocidos. `GET /movements/:slug`: detalle completo con instrucciones, error 404 ante movimientos ausentes o inactivos y error 400 ante `slugs` malformados. |
| `apps/api/test/movements-seed.spec.ts` | Semilla del catálogo | Verificación de idempotencia sobre la base de datos real, preservación de descripciones curadas manualmente y desactivación controlada (sin borrado físico) de ejercicios que salen del catálogo, preservando marcas preexistentes. |
| `apps/api/test/records.spec.ts` | Marcas personales | Exigencia de autenticación global. `POST /records`: registro de marcas en kg, conversión de libras a kg en `normalizedValue`, captura de repeticiones, duración y tiempo, conversión de km a metros, rechazo de unidades incongruentes, límites numéricos y decimales excedidos, tipos no permitidos por el ejercicio, inexistencia de movimientos, exigencia estricta de repeticiones en marcas de peso y rechazo en otros tipos, fechas futuras o con hora, y blindaje contra *mass assignment*. `Historial`: orden cronológico, detección de regresiones, separación de series por repeticiones (1RM vs 5RM) y dirección invertida en `TIME`. `PATCH /records/:id`: corrección conjunta de valor y unidad con recálculo normalizado. `DELETE /records/:id`: borrado lógico con `deletedAt`. `GET /records/summary`: consolidación de estadísticas, mejoras recientes y límite de 5 elementos recientes. |
| `apps/api/test/records-isolation.spec.ts` | Aislamiento multiinquilino | Comprobación de que un usuario Bob no visualiza las marcas de Alice en listados ni historiales, recibe código HTTP 404 al intentar modificar o eliminar marcas de Alice, y verificación de que los datos de Alice permanecen intactos. |
| `apps/api/test/shared-enums.spec.ts` | Sincronización de enums | Comprobación estricta de paridad exacta entre las enumeraciones del esquema de Prisma y las constantes TypeScript de `@garfit/domain` y `@garfit/movements`. |
| `apps/api/test/progress-snapshot.spec.ts` | Instantánea de progreso | Construcción determinista del resumen del atleta y sus marcas para el futuro contexto de IA, y funcionamiento correcto ante usuarios sin registros. |
| `apps/api/test/releases.spec.ts` | Distribución Android | Consulta de la última versión publicada, descarga binaria con cabeceras de integridad, ocultamiento de versiones borrador y mitigación de rutas maliciosas. |
| `apps/api/src/releases/storage/local-release-storage.spec.ts` | Almacenamiento local | Validación de claves de almacenamiento, rechazo de secuencias de escape de directorio (`..`) y lectura de enlaces simbólicos. |
| `packages/domain/src/units.test.ts` | Unidades y conversiones | Conversión exacta de libras a kg (1 lb = 0.45359237 kg) con 3 decimales, conversión de km y millas a metros, validación de unidades por tipo (`isUnitAllowed`), selección de unidades de despliegue según preferencia métrica/imperial (`displayUnitFor`), formateo de cadenas (`formatRecordValue`) y parseo bidireccional de duraciones (`formatDuration`, `parseDuration`). |
| `packages/domain/src/records.test.ts` | Algoritmos de progreso | Identificación de dirección de mejora (`lowerIsBetter`), discriminación de series homogéneas (`seriesKey`), cálculo de diferencias absolutas y porcentuales (`computeChange`), resumen cronológico de series (`summarizeSeries`: primer valor, mejor marca, cambio anterior, avance total y marcas personales), resolución de empates por antigüedad, persistencia de mejor marca ante regresiones y agrupador general (`summarizeAll`). |
| `packages/domain/src/dates-and-snapshot.test.ts` | Fechas y snapshot | Validación de fechas calendario reales en formato ISO, control de fechas futuras con margen de huso horario, cómputo de edad biológica y años de entrenamiento, validación de patrones kebab-case para `slugs` y generación de la estructura `AthleteProgressSnapshot`. |
| `packages/movements/src/movements.test.ts` | Movimientos y catálogo | Reglas de asignación de marcas (`recordTypesFor`), transformación determinista de la fuente externa (`transformSource`), deduplicación de variantes de ángulo de cámara, corrección ortográfica, normalización de músculos, sanitización con `slugify`, y verificación del catálogo final: 1319 movimientos válidos, sin campos vacíos y con slugs únicos. |
| `packages/validation/src/index.test.ts` | Esquemas Zod | Normalización de correos a minúsculas, validación de longitudes de contraseñas y rechazo de enumeraciones inválidas en el perfil deportivo. |
| `packages/api-client/src/index.test.ts` | Cliente HTTP | Adición de cabecera `Authorization: Bearer`, manejo transparente de respuestas HTTP 204 sin cuerpo, normalización de excepciones `ApiError` y consulta de versiones Android. |
| `apps/web/src/lib/auth-utils.test.ts` | Utilidades web | Sanitización de rutas de redirección local (`safeNext`) y traducción amigable de errores de autenticación. |
| `apps/web/src/lib/records.test.ts` | Utilidades de marcas web | Parseo y sanitización de parámetros de filtro y paginación (`parseMovementFilters`, `movementQuery`), conversión bidireccional de medidas del perfil métrico/imperial (`toProfileMetric`), cálculo de geometría de puntos y escala para la gráfica SVG (`chartPoints`), relación de aspecto apaisada para evitar desbordamientos verticales, formateo de cambios con signo explícito (`+5 kg`) y mapeo de errores de API a español. |

## 9.3 Pruebas de extremo a extremo (E2E con Playwright)

La suite E2E automatiza la navegación real de un atleta sobre la plataforma integrada, garantizando que los contratos de backend, las acciones de servidor de Next.js y los componentes de interfaz interactúan con éxito.

- **Fichero:** `apps/web/e2e/athlete-flow.spec.ts`.
- **Precondiciones de ejecución:**
  1. Base de datos PostgreSQL inicializada y migrada en el puerto 5442.
  2. Catálogo oficial de 1319 movimientos sembrado mediante `pnpm db:seed`.
  3. Paquetes del monorepo y aplicaciones compiladas (`pnpm build`).
  4. API NestJS corriendo en modo producción o desarrollo en `http://localhost:4000`.
  5. Aplicación web Next.js corriendo en `http://localhost:3000`.
  6. Binarios del navegador instalados mediante `pnpm exec playwright install chromium`.
- **Comando de ejecución:** `pnpm evidence:web`.
- **Recorrido del escenario `atleta registra y consulta sus marcas`:**
  1. Acceso a la ruta de inicio de sesión (`/login`) y captura de estado previo al registro (`01-login.png`).
  2. Navegación a la pantalla de registro, captura de nombre, correo electrónico aleatorio de prueba y contraseña segura, disparando la creación del usuario.
  3. Redirección automática a la vista de configuración obligatoria de perfil (`/app/profile`).
  4. Navegación hacia el panel de control principal (`/app`), constatando que el atleta recién registrado visualiza un estado vacío sin marcas previas (`02-dashboard-empty.png`).
  5. Retorno al perfil, captura del nombre visible y persistencia en la base de datos, verificando la notificación visual "perfil guardado" (`03-profile.png`).
  6. Navegación a la biblioteca de ejercicios (`/app/movements`), ingreso del término "barbell full squat" en el buscador y aplicación del filtro, verificando la aparición de la tarjeta correspondiente (`04-movements.png`).
  7. Clic en la tarjeta para ingresar a la vista detallada del ejercicio (`/app/movements/barbell-full-squat`), visualizando equipamiento, músculos e instrucciones (`05-movement-detail.png`).
  8. Clic en "Registrar una marca", captura del valor de 100 kg en 1RM con fecha fijada a 60 días en el pasado y envío del formulario (`06-record-form.png`).
  9. Registro consecutivo de una segunda marca para el mismo movimiento: 105 kg en 1RM con fecha de 10 días en el pasado.
  10. Acceso a la vista "Mis marcas" (`/app/records`), observando la tarjeta consolidada con el ejercicio y la mejor marca actual (`07-records.png`).
  11. Clic en "Ver historial" (`/app/records/barbell-full-squat`), comprobando la presencia del valor actual "105 kg", el distintivo de incremento calculado "+5 kg" y el renderizado del gráfico de evolución identificado por accesibilidad como `role="img"` (`08-record-history.png`).
  12. Regreso al panel principal (`/app`), confirmando que la sección "Movimientos con marca" se actualizó exactamente al valor numérico 1 (`09-dashboard.png`).

## 9.4 Procedimiento de ejecución y verificación documental

## 9.5 Verificación acumulada de la fase 3

La API se probó contra PostgreSQL de integración. El inventario siguiente identifica escenarios por nombre real, para que el lector pueda reproducirlos sin inferir pruebas inexistentes.

A continuación se presenta el inventario exhaustivo y fidedigno con los títulos reales de cada escenario de prueba (`it`/`test`) implementado en la fase 3, categorizado por suite de prueba con su respectivo criterio de aceptación formal:

### 9.5.1 Inventario de pruebas de integración de la API (`apps/api/test`)

#### 1. Entrenamientos generales (`apps/api/test/workouts.spec.ts`)
- **Suite:** `workouts`
- **Criterio de aceptación:** Verificar el ciclo de vida completo de un entrenamiento libre o clonado desde WOD, validando orden y posición de ejercicios, aislamiento multiinquilino, edición exclusiva de borradores, persistencia canónica de resultados (kg, metros), control de unicidad de series y borrado lógico con código HTTP 204.
- **Escenarios evaluados (`it`):**
  1. `crea libre conservando orden y objetivos`
  2. `crea desde WOD copiando prescripción y rechaza WOD inexistente`
  3. `rechaza movimiento inválido, campos extra y más de treinta ejercicios`
  4. `aísla todas las operaciones y valida UUID`
  5. `reemplaza ejercicios en draft, inicia y bloquea PATCH en progreso`
  6. `guarda resultados canónicos y valida score, ejercicio, duplicados y límite de series`
  7. `lista con paginación y filtros, y borra lógicamente`

#### 2. Marcas personales derivadas de entrenamientos (`apps/api/test/workout-records.spec.ts`)
- **Suite:** `marcas derivadas de workouts`
- **Criterio de aceptación:** Validar la deducción y persistencia de marcas personales al completar sesiones de fuerza o cardio, asegurando cálculo de incrementos absolutos y porcentuales sobre la mejor marca previa, separación estricta por repeticiones (1RM vs. 5RM) o distancia (5k vs. 10k), descarte de empates y regresiones, rechazo con código 422 ante sesiones incompletas y serialización transaccional idempotente bajo concurrencia.
- **Escenarios evaluados (`it`):**
  1. `crea 1RM, informa cambio y no registra empates o regresiones`
  2. `separa RM, conserva sólo la mejor de una serie y crea REPS sin carga`
  3. `crea TIME y DISTANCE para cardio, separando 5k y 10k`
  4. `valida completitud por tipo y acepta resultados al completar`
  5. `es idempotente y serializa completados concurrentes`

#### 3. Plantillas WOD (`apps/api/test/wods.spec.ts`)
- **Suite:** `WODs`
- **Criterio de aceptación:** Comprobar la consulta combinada de plantillas públicas y privadas, priorización de benchmarks oficiales en listados, aislamiento multiinquilino (código 404 ante WODs ajenos), y validación de reglas de prescripción y autenticación.
- **Escenarios evaluados (`it`):**
  1. `lista benchmarks antes que WODs personales y filtra sus atributos`
  2. `crea WOD privado, lo aísla y devuelve 404 a otro atleta`
  3. `valida prescripción, movimientos y autenticación`

#### 4. Estadísticas del atleta (`apps/api/test/workout-stats.spec.ts`)
- **Suite:** `GET /workouts/stats`
- **Criterio de aceptación:** Constatar el cómputo exacto de métricas para el panel de control: ceros en estado inicial, conteo de entrenamientos en ventanas móviles de 7 y 30 días, identificación del último entrenamiento, agregación de volumen en kg por movimiento y exclusión estricta de borradores o sesiones eliminadas lógicamente.
- **Escenarios evaluados (`it`):**
  1. `devuelve ceros cuando no hay entrenamientos`
  2. `calcula ventanas, último, volumen y omite drafts y borrados`

#### 5. Protección y extensión de marcas (`apps/api/test/records.spec.ts` — fase 3)
- **Suites:** `POST /records` y `PATCH /records/:id`
- **Criterio de aceptación:** Exigir calificador de distancia para marcas de tiempo cronometrado `TIME`, separar series según distancia (5k vs. 10k), exponer metadatos de procedencia `origin` y bloquear con HTTP 409 `RECORD_MANAGED_BY_WORKOUT` cualquier intento de modificación o borrado directo de marcas derivadas.
- **Escenarios evaluados (`it`):**
  1. `exige distancia para TIME, la separa por distancia y prohíbe distancia en peso`
  2. `no permite modificar ni borrar una marca derivada y expone su origen`

### 9.5.2 Inventario de pruebas unitarias de paquetes compartidos

#### 6. Lógica pura de entrenamientos (`packages/domain/src/workouts.test.ts`)
- **Suites:** `prescripciones y series`, `volumen y score`, `marcas y ventanas`
- **Criterio de aceptación:** Evaluar matemáticamente las funciones puras de dominio: validación de prescripciones por modalidad, conversión canónica de unidades, cálculo de volumen acumulado serie a serie, validación y formateo de score, extracción determinista de candidatos, selección de mejoras estrictas y ventanas temporales de agregación.
- **Escenarios evaluados (`it`):**
  1. `valida contratos por tipo e informa los parámetros impropios`
  2. `canonicaliza libras y kilómetros y detecta series inválidas`
  3. `suma el volumen real y rechaza entradas negativas o NaN`
  4. `valida y formatea score por tipo`
  5. `resume fuerza, cardio y ausencia de datos`
  6. `deriva candidatos y conserva la primera serie empatada`
  7. `selecciona sólo mejoras estrictas y compara TIME por distancia`
  8. `incluye límites de 7 y 30 días e ignora fechas inválidas`

#### 7. Esquemas de validación Zod (`packages/validation/src/schemas.test.ts`)
- **Suite:** `esquemas de entrenamiento`
- **Criterio de aceptación:** Verificar que `createWorkoutSchema` diferencie creación libre de clonación por WOD, que `updateWorkoutSchema` exija cambios reales en borradores y que `workoutResultsSchema` detecte ejercicios repetidos, series con `setNumber` duplicado y scores inválidos.
- **Escenarios evaluados (`it`):**
  1. `separa WOD estricto y entrenamiento libre con prescripción válida`
  2. `rechaza resultados repetidos, inválidos y scores con extras`

#### 8. Cliente HTTP tipado (`packages/api-client/src/index.test.ts`)
- **Suite:** `rutas de recursos`
- **Criterio de aceptación:** Verificar la construcción correcta de rutas HTTP autenticadas para entrenamientos y WODs, la resolución limpia de respuestas 204 con `undefined` en operaciones DELETE, y la preservación intacta del cuerpo y código de error funcional ante excepciones de conflicto y validación.
- **Escenarios evaluados (`it`):**
  1. `construye rutas de movimientos, marcas, WODs y entrenamientos autenticadas`
  2. `usa DELETE y devuelve undefined para borrar una marca o entrenamiento`
  3. `conserva código y details de errores de conflicto y validación`

### 9.5.3 Inventario de prueba de extremo a extremo (E2E con Playwright)

#### 9. Flujo completo del atleta en entrenamientos (`apps/web/e2e/workout-flow.spec.ts`)
- **Escenario E2E (sin describe):**
  - `'athlete-flow workout-flow'`
- **Criterio de aceptación:** Ejecutar sobre un navegador Chromium real el recorrido integral: registro de usuario y perfil; listado inicial vacío (`10-workouts-list.png`); construcción de entrenamiento de fuerza en sentadilla (`11-workout-builder.png`); inicio y registro interactivo de serie con 100 kg (`12-workout-active.png`); finalización con obtención de "Primera marca" (`13-workout-completed.png`); creación y ejecución de segunda sesión a 105 kg constatando la mejora "+5 kg" (`14-workout-detail.png`); consulta de historial filtrado (`16-history.png`); apertura de marca derivada verificando bloque de origen y leyenda "Gestionada por entrenamiento" sin botones de edición (`15-workout-pr.png`); consulta de panel de control con indicadores de volumen actualizados (`17-dashboard-workouts.png`); y construcción y cierre de sesión `FOR_TIME` con score de tiempo 05:30.

### 9.5.4 Defectos técnicos identificados y corregidos en la fase 3

Durante las fases de integración y verificación se detectaron siete anomalías que fueron resueltas antes del cierre formal de la fase:

| Defecto identificado | Mecanismo de detección | Corrección aplicada y verificación |
| --- | --- | --- |
| La primera versión de la función `complete` no era atómica ni transaccional | Prueba de integración concurrente (`workout-records.spec.ts` › `es idempotente y serializa completados concurrentes`) | Se encapsuló la finalización íntegra en `prisma.$transaction`, añadiendo el bloqueo asesor exclusivo `SELECT pg_advisory_xact_lock(hashtext(userId))` y actualización condicional atómica con `updateMany`, garantizando serialización determinista e idempotencia estricta ante peticiones simultáneas. |
| El detalle del entrenamiento devolvía listas de marcas y contadores estáticos | Pruebas de integración de API y verificación en pantalla | Se sustituyeron los valores fijos por la función dinámica `toDerivedPersonalRecords`, cruzando los identificadores de serie (`workoutResultId`) con las marcas persistidas del usuario y computando dinámicamente `personalRecordCount`. |
| Ausencia del bloque de trazabilidad `origin` en las marcas personales del historial | Revisión funcional y prueba de integración (`records.spec.ts` › `no permite modificar ni borrar una marca derivada y expone su origen`) | Se amplió la consulta de Prisma en `RecordsService` para incluir la relación `workoutResult` (junto con su ejercicio y entrenamiento contenedor), proyectando en `toPersonalRecord` los metadatos de procedencia: `workoutId`, `workoutName`, `performedOn`, `setNumber` y `reps`. |
| La repetición accidental del número de serie `setNumber` causaba un error 500 no controlado de base de datos | Prueba de integración de API (`workouts.spec.ts` › `guarda resultados canónicos y valida score, ejercicio, duplicados y límite de series`) | Se incorporó una validación previa en `WorkoutsService.replaceResults` que verifica la unicidad de las claves compuestas `exerciseId:setNumber`, arrojando una excepción controlada `ApiException(400, 'VALIDATION_FAILED', 'El número de serie debe ser único')` antes de alcanzar la restricción de PostgreSQL. |
| El esquema de creación de plantillas WOD rechazaba cargas cuando se omitían campos opcionales | Pruebas unitarias de esquemas (`schemas.test.ts`) e integración de WODs (`wods.spec.ts`) | Se ajustó `createWodSchema` y sus esquemas asociados en `@garfit/validation` para aceptar explícitamente valores nulos o no provistos en atributos opcionales como `description`, `notes`, `rounds` o `durationSeconds`. |
| Un escenario de prueba previo permitía modificar o retirar marcas derivadas directamente | Auditoría de especificación y pruebas de aislamiento en `records.spec.ts` | Se fortaleció `RecordsService.findOwnedRecord` para evaluar `record.source === 'WORKOUT'`, bloqueando peticiones directas de `PATCH` o `DELETE` con `ApiException(409, 'RECORD_MANAGED_BY_WORKOUT', 'Esta marca proviene de un entrenamiento: gestiónala desde el entrenamiento')`. |
| Las Server Actions web capturaban la excepción interna `NEXT_REDIRECT` impidiendo la navegación | Ejecución del flujo E2E automatizado con Playwright (`workout-flow.spec.ts`) | En `apps/web/src/app/workout-actions.ts`, se reposicionaron las llamadas a `redirect()` estrictamente fuera de los bloques `try/catch` para permitir que el error de control `NEXT_REDIRECT` sea procesado nativamente por el runtime de Next.js en lugar de ser tratado como fallo de API. |

La verificación sobre dispositivo móvil físico permanece formalmente declarada como PENDIENTE por indisponibilidad de hardware y emuladores AVD en el entorno de desarrollo.

Para reproducir la suite de verificación completa en un entorno local:

```sh
# 1. Verificación estática y de tipos
pnpm lint
pnpm typecheck

# 2. Compilación del monorepo
pnpm build

# 3. Pruebas automatizadas de unidades e integración
pnpm test

# 4. Generación y verificación del contrato documental
pnpm docs:generate
pnpm docs:check

# 5. Ejecución del flujo de evidencia E2E (con servicios activos)
pnpm db:seed
pnpm evidence:web
```

Criterio de éxito: todas las herramientas deben culminar con código de retorno 0. El comando `docs:check` garantiza adicionalmente que ningún cambio en los modelos de Prisma o controladores de NestJS haya provocado divergencias no versionadas en la especificación OpenAPI o el diagrama entidad-relación ERD.

## 9.8 Verificación de la fase 4

La API incorporó tres grupos de pruebas. El grupo de estado y operaciones comprueba consentimiento, datos insuficientes y las cuatro operaciones; el de validación comprueba caché, esquema, evidencia y errores del proveedor; el de seguridad comprueba aislamiento, minimización e inyección. Las pruebas de dominio verifican que los hechos y sus identificadores sean deterministas antes de que intervenga un proveedor.

| Grupo | Casos representativos y garantía |
| --- | --- |
| Estado y consentimiento | `expone estado sin filtrar credenciales`, `exige consentimiento para las cuatro operaciones` y `conserva la fecha al consentir y permite revocarla`: estado seguro y consentimiento revocable. |
| Operaciones | `analiza progreso con hechos resueltos y datos usados`, `no llama al proveedor cuando faltan datos`, `analiza sólo entrenamientos completados y distingue ausentes` y `explica WODs benchmark y movimientos del catálogo`: contexto y evidencia. |
| Validación | `rechaza texto no JSON después de un único reintento`, `rechaza salidas que incumplen el esquema`, `no persiste una salida que cita evidencia inexistente` y `acepta la segunda respuesta cuando corrige la primera`: rechazo seguro y reintento único. |
| Caché y proveedor | `normaliza errores del proveedor sin revelar su mensaje`, `reutiliza el análisis idéntico sin invocar de nuevo al proveedor` e `invalida la caché cuando cambian los datos y por periodo`: resiliencia y caché. |
| Seguridad | `oculta a A el entrenamiento y WOD privado de B`, `no reutiliza ni atribuye a B los análisis de A`, `trata notas inyectadas como datos y minimiza el contexto` y `funciona con el doble del contrato y reserva Gemini para su adaptador`: aislamiento, inyección y sustitución. |
| Dominio | `serializa de forma estable valores, arrays, undefined y fechas`, `genera ids deterministas y slugs de serie canónicos` y `detecta ids inventados ordenados y resuelve sólo hechos conocidos sin duplicarlos`: hash y evidencia. |

Los recorridos E2E verificaron consentimiento, panel de IA, análisis de progreso, evidencia, análisis de entrenamiento, explicación de WOD, explicación de movimiento y creación de WOD. Los defectos de fase se identificaron mediante estos recorridos y las suites: esquema JSON vacío en el proveedor, validación casera, dependencias ausentes del módulo, clasificación incorrecta de timeout, localización del contexto simulado, formato de fecha ISO en web, etiqueta accesible truncada y fechas fijas en la semilla. Todos fueron corregidos antes del cierre.

## 9.10 Inventario de verificación de fase 5

### 9.10.1 Inventario API: historial, WOD y release

El grupo `apps/api/test/ai-history.spec.ts`, **historial de análisis de IA**, contiene los siguientes títulos reales:

- `lista análisis con etiquetas, orden, paginación y filtro`: garantiza orden descendente, filtro, metadatos de paginación y etiquetas de objetivos.
- `aísla, muestra el detalle guardado sin regenerarlo y permite borrados propios`: garantiza aislamiento entre cuentas, respuesta almacenada sin invocar al proveedor y borrado individual autorizado.
- `borra únicamente el historial autenticado y conserva lo previo al revocar consentimiento`: garantiza el alcance por usuario y la política de retención al revocar.

El grupo `apps/api/test/wod-performance.spec.ts`, **rendimiento por WOD**, verifica:

- `informa cero intentos y permite comparar un benchmark sin ejecuciones`;
- `calcula mejor, última y cambio entre intentos FOR_TIME`;
- `cuenta sólo ejecuciones propias, completadas, no borradas y vinculadas al WOD`;
- `oculta WODs privados y marca AMRAP de esquema desconocido`.

En conjunto, prueba que el endpoint no mezcla atletas, borradores, eliminados ni entrenamientos libres, y que comunica la indisponibilidad de una comparación.

El grupo `apps/api/test/releases.spec.ts`, **releases Android**, incluye:

- `informa cuando no hay releases o sólo hay borradores`;
- `devuelve la publicada con mayor versionCode en la forma pública`;
- `descarga el APK publicado con cabeceras y bytes correctos`;
- `descarga la última publicada y no sirve borradores como última`;
- `valida la versión y oculta inexistentes, borradores y archivos ausentes`;
- `no sirve una ruta maliciosa almacenada en la base de datos`.

Estas pruebas cubren selección de release, ocultación de borradores, validación de ruta y entrega binaria segura. En particular, `descarga el APK publicado con cabeceras y bytes correctos` recalcula SHA-256 de los bytes recibidos y lo compara con `X-Checksum-Sha256` y el metadato publicado.

`apps/api/test/workout-stats.spec.ts › compara las métricas del periodo actual con las del anterior` garantiza que `GET /workouts/stats` separa las dos ventanas y devuelve diferencias de entrenamientos, días, volumen y porcentaje esperado.

### 9.10.2 Inventario de dominio y clientes

En `packages/domain/src/comparisons.test.ts`, **comparación de rendimiento de WOD**, se verifican literalmente: `conserva una comparación disponible sin ejecuciones FOR_TIME`, `usa la única ejecución FOR_TIME como mejor y última`, `calcula la mejora FOR_TIME al reducir 24 segundos`, `mantiene la mejor histórica cuando la última ejecución FOR_TIME empeora`, `conserva la primera mejor marca ante un empate exacto`, `descarta un FOR_TIME que sólo alcanzó repeticiones al límite`, `compara AMRAP por repeticiones totales y conserva su display`, `declara AMRAP sin esquema como no comparable`, `declara los tipos no comparables con su motivo`, `compara STRENGTH por volumen y descarta ejecuciones sin volumen` y `ordena el historial de forma determinista aunque cambie el orden de entrada`.

El describe **comparación entre periodos** de ese mismo archivo inventaría `separa las ventanas actual y anterior de 30 días`, `cuenta los días de entrenamiento distintos`, `suma el volumen de las series de cada periodo`, `cuenta sólo las fechas de marcas que caen dentro de cada ventana`, `devuelve porcentaje nulo ante periodo anterior vacío y lo calcula si existe` y `desplaza las ventanas de la misma forma con 60 y 90 días`. Garantiza unidades, exclusiones, orden y ventanas contiguas antes de cualquier adaptación de interfaz.

El describe nuevo **hechos de comparación para IA** de `packages/domain/src/ai.test.ts` contiene `incluye la comparación de entrenamientos del periodo sin repetir identificadores`, `expone el rendimiento de WOD con displays y mejora absoluta`, `no produce hechos de WOD sin comparación o sin intentos` e `incluye los hechos de WOD sólo cuando el entrenamiento tiene WOD`. Garantiza que la evidencia entregada a IA contiene hechos calculados, identificadores únicos y ninguna inferencia cuando faltan datos comparables.

El describe **historial de análisis y rendimiento por WOD** de `packages/api-client/src/index.test.ts` cubre `lista el historial con filtros en la consulta`, `abre un análisis guardado por su identificador`, `borra una entrada y el historial completo con DELETE` y `consulta el rendimiento de un WOD codificando el slug`. Garantiza método HTTP, rutas y codificación del contrato del cliente.

En `apps/web/src/lib/ai-history.test.ts`, **formatAnalysisHistoryRow** incluye `muestra tipo, objetivo y fecha legibles`; y en `apps/web/src/lib/comparisons.test.ts`, **formatters de comparaciones**, incluye `explica cada razón no comparable` y `describe un porcentaje no disponible`. Estos grupos garantizan que la web presenta etiquetas y ausencia de porcentaje sin inventar información deportiva.

### 9.10.3 Recorridos E2E y defectos corregidos

Los tres E2E añadidos son `ai-history.spec.ts › historial de análisis IA guardados`, que crea, consulta y abre evidencia guardada; `wod-performance.spec.ts › rendimiento del WOD Fran`, que registra dos intentos y comprueba la tarjeta y el panel; y `landing-download.spec.ts › descarga y metadatos de la release Android`, que comprueba versión, tamaño, fecha, enlace estable, QR, notas, SHA-256 e instrucciones. La entrega HTTP se comprobó adicionalmente con 200, 104 931 518 bytes y SHA-256 `e4eabfe20c7dd44d4ef0ca6d448b2ff98f03caf13e4ae7559166cb8f95846bd5`.

| Defecto de fase | Cómo se detectó | Corrección |
| --- | --- | --- |
| Esquema JSON vacío del proveedor | Suite de IA | Se validó la salida contra el esquema antes de guardarla. |
| Validación casera | Suites de contrato | Se sustituyó por la validación compartida del dominio. |
| Dependencias ausentes del módulo | Typecheck | Se declararon e integraron las dependencias requeridas. |
| Clasificación incorrecta de timeout | Pruebas del proveedor | Se clasificó como indisponibilidad reintentable. |
| Contexto simulado en ubicación incorrecta | Pruebas de dominio | Se corrigió el montaje del contexto de prueba. |
| Formato de fecha ISO en web | Prueba de interfaz | Se formatea la fecha en la capa web. |
| Etiqueta accesible truncada | E2E de historial | Se expuso la etiqueta completa para abrir el análisis. |
| Fechas fijas en la semilla | E2E y comparación de periodos | Se sustituyeron por fechas relativas. |

Las pruebas API añadidas incluyen `ai-history.spec.ts › lista análisis con etiquetas, orden, paginación y filtro`, `ai-history.spec.ts › aísla, muestra el detalle guardado sin regenerarlo y permite borrados propios` y `ai-history.spec.ts › borra únicamente el historial autenticado y conserva lo previo al revocar consentimiento`. Para rendimiento se verifican `wod-performance.spec.ts › calcula mejor, última y cambio entre intentos FOR_TIME` y `wod-performance.spec.ts › cuenta sólo ejecuciones propias, completadas, no borradas y vinculadas al WOD`.

En dominio, `comparisons.test.ts › compara AMRAP por repeticiones totales y conserva su display`, `comparisons.test.ts › compara STRENGTH por volumen y descarta ejecuciones sin volumen` y `comparisons.test.ts › separa las ventanas actual y anterior de 30 días` cubren reglas nuevas. En el cliente, `index.test.ts › lista el historial con filtros en la consulta`, `index.test.ts › abre un análisis guardado por su identificador`, `index.test.ts › borra una entrada y el historial completo con DELETE` e `index.test.ts › consulta el rendimiento de un WOD codificando el slug` comprueban contratos.

Los E2E nuevos son `ai-history.spec.ts › historial de análisis IA guardados`, `wod-performance.spec.ts › rendimiento del WOD Fran` y `landing-download.spec.ts › descarga y metadatos de la release Android`. Las dos rutas de descarga devolvieron 200, 104 931 518 bytes y el SHA-256 `e4eabfe20c7dd44d4ef0ca6d448b2ff98f03caf13e4ae7559166cb8f95846bd5`. En ejecuciones E2E encadenadas, el límite de diez peticiones de autenticación por minuto puede fallar; para la evidencia se inició la API con `NODE_ENV=test`, que lo desactiva.
