# 5. Requerimientos

## 5.1 Criterio de especificación

Cada requerimiento del sistema se formula identificando de forma explícita el actor involucrado, la acción o comportamiento esperado, un criterio de aceptación verificable, su nivel de prioridad y su estado real de implementación. En el marco metodológico de este proyecto de titulación, el estado "Implementado" denota que la funcionalidad cuenta con código fuente funcional en el repositorio, pruebas automatizadas o de extremo a extremo que comprueban su comportamiento y evidencia documental auditable en la matriz de trazabilidad ([`docs/TRACEABILITY.md`](../TRACEABILITY.md)). Las funcionalidades que carecen de soporte en el modelo de datos o endpoints activos se clasifican rigurosamente como "Planeado".

A continuación se sintetiza el inventario completo de requerimientos funcionales y no funcionales del sistema hasta la fase 2:

| ID | Tipo | Descripción, actor y criterio de aceptación | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| RF-01 | Funcional | El atleta registra una cuenta local e inicia sesión. Se acepta si el correo se normaliza a minúsculas, la contraseña se hashea con Argon2id y las credenciales inválidas responden con un mensaje homogéneo que no revela la existencia del usuario. | Alta | Implementado fase 1 |
| RF-02 | Funcional | El atleta inicia sesión mediante Google OAuth. Se acepta si el servidor valida el ID token, audiencia y verificación del correo, vinculando la cuenta sin duplicar registros. | Alta | Implementado fase 1 (requiere credenciales en despliegue) |
| RF-03 | Funcional | El atleta consulta y actualiza su perfil deportivo inicial. Se acepta si los datos se aíslan estrictamente por usuario autenticado y se rechazan valores fuera de catálogo. | Alta | Implementado fase 1 |
| RF-04 | Funcional | Un visitante o cliente móvil consulta y descarga la última versión del APK Android. Se acepta si se ofrece únicamente la versión publicada con mayor `versionCode`, con verificación de integridad SHA-256 y bloqueo de borradores. | Media | Implementado fase 1 |
| RF-05 | Funcional | El atleta consulta el catálogo de movimientos con búsqueda por texto libre, filtros combinados (categoría, equipamiento, tipo de marca, dificultad y músculos) y paginación determinista. Se acepta si devuelve únicamente movimientos activos ordenados alfabéticamente y responde con metadatos de paginación precisos. | Alta | Implementado fase 2 |
| RF-06 | Funcional | El atleta consulta el detalle de un movimiento específico mediante su `slug`. Se acepta si expone instrucciones paso a paso, clasificación anatómica, equipamiento, tipos de marca admitidos y trazabilidad a la fuente original. | Media | Implementado fase 2 |
| RF-07 | Funcional | El atleta registra marcas personales (`PersonalRecord`) en modalidades de peso, repeticiones, distancia, duración o tiempo. Se acepta si almacena el valor introducido con su unidad, calcula el valor canónico en el servidor y restringe los tipos de marca a los admitidos por el movimiento. | Alta | Implementado fase 2 |
| RF-08 | Funcional | El atleta corrige o retira marcas personales previamente registradas. Se acepta si la edición mediante `PATCH` recalcula el valor normalizado y el retiro ejecuta un borrado lógico (`deletedAt`) que excluye la marca de resúmenes e historial sin destruir la fila física. | Alta | Implementado fase 2 |
| RF-09 | Funcional | El atleta consulta el historial cronológico y la evolución de sus marcas en un movimiento. Se acepta si agrupa los registros en series homogéneas (separando repeticiones en marcas de peso), identifica la mejor marca histórica, calcula cambios absolutos y porcentuales, y proyecta la gráfica visual correspondiente. | Alta | Implementado fase 2 |
| RF-10 | Funcional | El atleta visualiza en su panel de control (dashboard) un resumen de marcas personales. Se acepta si muestra el conteo total de marcas, cantidad de movimientos con marca, accesos directos a los registros más recientes y la última mejora conseguida. | Media | Implementado fase 2 |
| RF-11 | Funcional | El atleta amplía su perfil deportivo con sistema de unidades preferido (`METRIC` o `IMPERIAL`), medidas antropométricas opcionales (peso en kg, altura en cm) y fechas de nacimiento y comienzo de entrenamiento. Se acepta si valida límites biológicos admisibles y previene el registro de campos médicos no autorizados. | Media | Implementado fase 2 |
| RF-12 | Funcional | El atleta interactúa con el dominio deportivo a través de clientes web y móvil. Se acepta si los flujos de navegación, consulta y captura de marcas operan coordinadamente sobre la API REST común. | Alta | Implementado fase 2 (Web verificada con E2E; Móvil verificado mediante compilación y tipos) |
| RF-13 | Funcional | El atleta define y consulta plantillas de entrenamiento y rutinas estructuradas (`Workout`, `WorkoutExercise`, WODs). | Alta | Planeado (fase 3) |
| RF-14 | Funcional | El atleta registra la ejecución de sesiones completas de entrenamiento y sus resultados cuantitativos (`WorkoutResult`). | Alta | Planeado (fase 3) |
| RF-15 | Funcional | El sistema genera automáticamente marcas personales a partir de los resultados de sesiones de entrenamiento registradas (`source: WORKOUT`). | Media | Planeado (fase 3) |
| RF-16 | Funcional | El atleta recibe análisis y recomendaciones deportivas adaptativas generadas por un asistente de IA basado en modelos Gemini. | Media | Planeado (fase 3) |
| RNF-01 | No funcional | Almacenamiento seguro de tokens: la aplicación web utiliza cookies `httpOnly` con bandera `SameSite=Lax` y la aplicación móvil emplea `SecureStore`. | Alta | Implementado fase 1 |
| RNF-02 | No funcional | Gestión robusta de sesiones: tokens de refresco opacos, rotativos y almacenados únicamente como resumen SHA-256 en base de datos, con detección y revocación ante intentos de reutilización. | Alta | Implementado fase 1 |
| RNF-03 | No funcional | Compartición de contratos y esquemas: los clientes consumen interfaces de TypeScript y validadores compartidos para garantizar coherencia en la comunicación. | Media | Implementado fase 1 |
| RNF-04 | No funcional | Documentación viva como código: generación automatizada de OpenAPI, diagramas ERD y verificación estricta de diferencias documentales en integración continua (`--check`). | Media | Implementado fase 1 |
| RNF-05 | No funcional | Delimitación arquitectónica de IA: aislamiento del proveedor Gemini en el backend, sin exposición de secretos ni dependencias en los paquetes cliente. | Alta | Implementado fase 1 |
| RNF-06 | No funcional | Gestión canónica de unidades: soporte transparente para kilogramos y libras, metros, kilómetros, millas y segundos, realizando todas las comparaciones matemáticas sobre un valor canónico normalizado con factores de conversión exactos. | Alta | Implementado fase 2 |
| RNF-07 | No funcional | Determinismo algebraico: el cálculo de mejores marcas, progresos porcentuales y clasificaciones históricas se realiza mediante algoritmos puristas en `@garfit/domain`, sin intervención de modelos estocásticos ni IA. | Alta | Implementado fase 2 |
| RNF-08 | No funcional | Aislamiento multiinquilino estricto: toda operación de lectura, mutación o borrado de marcas y perfiles valida la pertenencia al identificador del usuario autenticado; cualquier intento de acceso cruzado responde con código HTTP 404. | Alta | Implementado fase 2 |
| RNF-09 | No funcional | Preservación de trazabilidad histórica mediante borrado lógico: la desactivación de marcas personales asigna una marca temporal en `deletedAt`, manteniendo la integridad de auditoría sin perturbar los cálculos activos. | Alta | Implementado fase 2 |
| RNF-10 | No funcional | Validación perimetral exhaustiva y límites cuantitativos: validación de rangos numéricos razonables, precisión máxima de 3 decimales, fechas pasadas coherentes y paginación con límite máximo de 50 elementos por página. | Media | Implementado fase 2 |
| RNF-11 | No funcional | Única fuente de verdad de reglas de negocio: centralización de límites, enumeraciones y cálculos en el paquete agnóstico `@garfit/domain`, sincronizado mediante pruebas automatizadas con el esquema de Prisma. | Alta | Implementado fase 2 |
| RNF-12 | No funcional | Reproducibilidad del catálogo y cumplimiento de licencias: catálogo de movimientos compilado de manera determinista a partir de un commit fijado bajo licencia MIT, excluyendo estrictamente activos protegidos por derechos de autor (media Gym visual ©). | Alta | Implementado fase 2 |

## 5.2 Requerimientos de la fase 1 (fundación e identidad)

La fase 1 estableció los cimientos de la arquitectura modular y los mecanismos de seguridad perimetral. Sus requerimientos funcionales y no funcionales se mantienen plenamente vigentes y probados:

1. **RF-01 (Autenticación local):** Provee el registro e ingreso mediante correo electrónico y contraseña. El servidor normaliza los correos electrónicos a minúsculas y deriva los hashes mediante la función criptográfica lenta Argon2id con sal aleatoria. Las fallas de autenticación responden uniformemente con el código `INVALID_CREDENTIALS` sin indicar si el fallo provino del usuario o de la clave.
2. **RF-02 (Autenticación federada con Google):** Permite el inicio de sesión delegando la verificación de identidad en los servidores de Google mediante tokens de identidad (`id_token`). La API NestJS valida el emisor, la audiencia y la bandera de correo verificado (`email_verified`), vinculando la cuenta sin duplicar identidades locales previas.
3. **RF-03 (Perfil deportivo inicial):** Establece la relación 1:1 entre el usuario y su perfil deportivo (`AthleteProfile`), permitiendo definir el nombre público, nivel de experiencia y objetivo principal del atleta.
4. **RF-04 (Distribución de cliente Android):** Expone un mecanismo seguro de consulta y descarga de instaladores APK, ordenados por `versionCode` y verificados mediante sumas de comprobación SHA-256.
5. **RNF-01 a RNF-05 (Seguridad perimetral y arquitectura documental):** Implementan cookies seguras, rotación estricta de tokens de refresco, contratos compartidos entre aplicaciones, verificación automatizada de esquemas documentales y aislamiento de las claves de Gemini en el entorno seguro del servidor.

## 5.3 Requerimientos de la fase 2 (dominio deportivo)

La fase 2 introduce la lógica deportiva esencial para el atleta: el descubrimiento de ejercicios, la administración de marcas personales y el análisis de la progresión deportiva.

### 5.3.1 Catálogo de movimientos (RF-05 y RF-06)

El sistema debe proveer una biblioteca estandarizada y taxonómicamente categorizada de movimientos corporales para evitar que el usuario deba registrar ejercicios con nombres ambiguos o redundantes.

- **Criterio de aceptación de RF-05 (Consulta y búsqueda):**
  1. El endpoint `GET /movements` permite buscar por coincidencia parcial de texto en el nombre del movimiento (insensible a mayúsculas y acentos), con una longitud máxima de búsqueda de 80 caracteres.
  2. Admite filtros opcionales por categoría anatómica (`MovementCategory`), tipo de equipamiento (`Equipment`), tipo de marca admitida (`RecordType`), nivel de dificultad (`MovementDifficulty`) y grupos musculares principales o secundarios (`MuscleGroup`). Los filtros combinados se aplican mediante conjunción lógica (AND).
  3. La respuesta implementa paginación estructurada (`page` y `limit`, con un máximo de 50 elementos por página) e incluye únicamente registros que se encuentren en estado activo (`isActive: true`), ordenados alfabéticamente por nombre.
  4. Los parámetros no reconocidos o valores ajenos a las enumeraciones oficiales son rechazados con código HTTP 400 (`VALIDATION_FAILED`).
- **Criterio de aceptación de RF-06 (Detalle de movimiento):**
  1. El endpoint `GET /movements/:slug` resuelve el ejercicio a partir de su identificador textual legible (`slug`).
  2. Devuelve la lista completa de instrucciones de ejecución en español, equipamiento requerido, músculos involucrados (clasificados en primarios y secundarios), tipos de marca compatibles y metadatos de atribución a la fuente original.
  3. Si el `slug` no existe o el movimiento está desactivado, el sistema responde con código HTTP 404 (`MOVEMENT_NOT_FOUND`).

### 5.3.2 Registro, corrección y retiro de marcas personales (RF-07 y RF-08)

El núcleo funcional del rendimiento atlético reside en la captura fiel de los logros alcanzados en cada movimiento.

- **Criterio de aceptación de RF-07 (Registro de marcas):**
  1. El atleta puede registrar marcas en cinco naturalezas distintas: peso (`WEIGHT`), repeticiones máximas (`REPS`), distancia recorrida (`DISTANCE`), tiempo sostenido o isometría (`DURATION`) y tiempo empleado en completar un recorrido (`TIME`).
  2. La API valida que el tipo de marca solicitado pertenezca a los `recordTypes` formalmente permitidos por el movimiento (p. ej., una sentadilla con barra admite peso y repeticiones, mientras que una plancha admite duración e isometría).
  3. Para marcas de peso (`WEIGHT`), se exige indicar el número de repeticiones para las que se logró la marca (`repetitions`, típicamente 1 para 1RM, o 5 para 5RM). En el resto de tipos de marca, este campo debe ser nulo.
  4. El atleta puede ingresar el valor en unidades métricas o imperiales (según las unidades válidas para el tipo de marca). La API almacena el valor y la unidad tal cual fueron ingresados (`value` y `unit`) y calcula en el backend el valor normalizado en la unidad canónica correspondiente (`normalizedValue`).
  5. Se rechazan valores no positivos, valores con más de 3 decimales, fechas futuras o fechas anteriores a 1900-01-01.
- **Criterio de aceptación de RF-08 (Corrección y retiro):**
  1. Mediante `PATCH /records/:id`, el atleta puede corregir errores tipográficos en el valor, la unidad, la fecha de realización o las notas de una marca propia. No se permite enviar un cuerpo vacío ni alterar campos gestionados por el servidor (`source`, `userId`, `movementId`, `recordType`).
  2. Mediante `DELETE /records/:id`, el atleta puede dar de baja una marca. La eliminación es de carácter lógico: se fija la marca de tiempo `deletedAt = now()`. La fila permanece físicamente en la base de datos para trazabilidad histórica, pero se excluye de manera inmediata de todos los listados, resúmenes y cálculos de progreso.

### 5.3.3 Historial, evolución y resumen en panel de control (RF-09 y RF-10)

Los datos de marcas personales deben agregarse y presentarse de manera clara para que el atleta comprenda su desarrollo deportivo a lo largo del tiempo.

- **Criterio de aceptación de RF-09 (Historial y series homogéneas):**
  1. El endpoint `GET /records/:movementSlug` agrupa las marcas del atleta en series comparables (`RecordSeriesSummary`). Dos marcas sólo pertenecen a la misma serie si comparten el mismo movimiento, el mismo tipo de marca y, en el caso de marcas de peso, el mismo número de repeticiones.
  2. Los registros se ordenan cronológicamente por fecha de realización (`performedAt`) y, ante empate exacto de fecha, por fecha de registro en el sistema (`createdAt`).
  3. Para cada serie, el sistema identifica el registro inicial (`first`), el registro más reciente (`current`) y la mejor marca histórica (`best`).
  4. Se computan métricas deterministas de progreso: cambio respecto al registro inmediatamente anterior (`changeFromPrevious`), magnitud de superación de la mejor marca anterior (`bestImprovement`) y cambio acumulado total desde el primer registro (`totalProgress`), expresados en valor canónico absoluto y porcentaje relativo.
  5. En la interfaz web y móvil se despliega una gráfica bidimensional SVG que ilustra la curva de marcas en el tiempo y resalta visualmente los puntos que constituyeron una marca personal (`isPersonalBest`).
- **Criterio de aceptación de RF-10 (Resumen en dashboard):**
  1. El endpoint `GET /records/summary` consolida en una única consulta el estado deportivo del usuario: total de registros activos, cantidad de movimientos distintos con marcas y la lista de los últimos 5 registros ordenados cronológicamente.
  2. Si el atleta cuenta con marcas registradas, el resumen identifica y expone la mejora más reciente lograda por el usuario, indicando el movimiento, la fecha y la magnitud del avance.
  3. Si el atleta no cuenta con marcas registradas, el sistema devuelve una respuesta vacía estructurada sin provocar errores de renderizado en las aplicaciones cliente.

### 5.3.4 Perfil deportivo ampliado e interfaz multiplataforma (RF-11 y RF-12)

El contexto antropométrico del atleta permite interpretar adecuadamente las cargas y esfuerzos realizados.

- **Criterio de aceptación de RF-11 (Perfil ampliado):**
  1. El atleta puede configurar su sistema de unidades preferido (`preferredUnits`: `METRIC` o `IMPERIAL`), el cual determina la presentación visual por defecto de pesos y distancias en la interfaz de usuario.
  2. Admite campos antropométricos opcionales: fecha de nacimiento (`birthDate`), fecha de inicio en el entrenamiento (`trainingSince`), altura en centímetros (`heightCm`, rango permitido 50 a 272 cm) y peso corporal en kilogramos (`weightKg`, rango permitido 20 a 400 kg).
  3. Los campos de peso y altura se almacenan de forma canónica en el servidor en kilogramos y centímetros respectivamente, convirtiéndose desde unidades imperiales en el cliente cuando sea necesario.
  4. Se rechazan fechas futuras, edades biológicas menores a 5 o mayores a 120 años, y fechas de inicio de entrenamiento anteriores a la fecha de nacimiento.
  5. El perfil rechaza estrictamente la inclusión de atributos médicos o clínicos no tipificados.
- **Criterio de aceptación de RF-12 (Experiencia multiplataforma):**
  1. La aplicación web Next.js (`apps/web`) y la aplicación móvil Expo (`apps/mobile`) implementan vistas dedicadas para la exploración del catálogo, visualización de fichas de ejercicios, captura de marcas y revisión de historiales.
  2. En web, el flujo completo se valida mediante pruebas de extremo a extremo (E2E) con Playwright, garantizando que el usuario puede registrarse, navegar, consultar el catálogo, registrar marcas y visualizar el historial y el dashboard actualizado.

## 5.4 Requerimientos no funcionales de la fase 2

### 5.4.1 Manejo canónico de unidades y reproducibilidad de datos (RNF-06 y RNF-12)

Para prevenir distorsiones acumulativas por conversión o discrepancias entre dispositivos que empleen distintos sistemas de medición, el sistema adopta una arquitectura de almacenamiento canónico:

- Toda marca personal se normaliza en el backend mediante factores de conversión exactos (1 lb = 0.45359237 kg; 1 mi = 1609.344 m).
- El valor introducido por el atleta se preserva en su formato textual y unidad original (`value` y `unit`) para evitar mostrar valores con decimales espurios (p. ej., evitar que 225 lb se transforme en 224.9 lb tras redondeos sucesivos).
- El catálogo de movimientos se genera mediante scripts reproducibles a partir de una fuente inmutable con licencia MIT (`hasaneyldrm/exercises-dataset`, commit `7455efae41b330c265e7cd4b78dfa848e7ce5ebd`). Se descarta deliberadamente todo contenido multimedia comercial para preservar la seguridad jurídica del proyecto.

### 5.4.2 Determinismo algebraico en el cálculo de progreso (RNF-07)

El cálculo de qué registro constituye una mejor marca o cuál ha sido el progreso relativo de un atleta es un proceso estrictamente matemático y auditable:

- Los tipos `WEIGHT`, `REPS`, `DISTANCE` y `DURATION` operan bajo la premisa de que un valor numérico mayor representa una mejora deportiva.
- El tipo `TIME` opera bajo la premisa inversa: un menor tiempo cronometrado para una tarea fija representa una mejora deportiva.
- En caso de empate en el valor normalizado, la mejor marca histórica se adjudica al registro más antiguo en alcanzar dicha marca.
- Ningún algoritmo de inferencia probabilística, heurística generativa o modelo de lenguaje (LLM) interviene en la determinación de marcas, porcentajes o comparaciones numéricas.

### 5.4.3 Seguridad, aislamiento multiusuario y borrado lógico (RNF-08 y RNF-09)

La privacidad y la integridad de los datos del atleta se garantizan a nivel de persistencia y servicio:

- Todos los endpoints de marcas y perfil filtran sus consultas forzando la cláusula `userId = token.userId`.
- Si un usuario autenticado intenta consultar, editar o retirar el identificador de una marca que pertenece a otro atleta, la API responde con código HTTP 404 (`RECORD_NOT_FOUND`), previniendo ataques de enumeración y fuga de información sobre la existencia de recursos ajenos.
- El retiro de marcas utiliza borrado lógico mediante la columna `deletedAt`. Esto permite preservar la auditoría y la trazabilidad de los datos ante eventuales disputas o revisiones históricas.

### 5.4.4 Validación estricta y única fuente de verdad (RNF-10 y RNF-11)

La integridad estructural del monorepo se sostiene mediante la centralización de reglas en el paquete `@garfit/domain`:

- Las restricciones de longitud de cadenas, formatos de fecha ISO (`YYYY-MM-DD`), límites de peso y repeticiones, y nombres de enumeraciones se definen una sola vez en código TypeScript puro dentro de `@garfit/domain`.
- La API valida estas restricciones en su límite perimetral usando `ValidationPipe` y DTOs de NestJS.
- Pruebas automatizadas de integración (`apps/api/test/shared-enums.spec.ts`) comparan en tiempo de prueba que las enumeraciones de Prisma coincidan exactamente con las constantes de `@garfit/domain`.

## 5.5 Requerimientos planeados para la fase 3

Los siguientes requerimientos forman parte del alcance proyectado para la fase 3 (entrenamientos estructurados e inteligencia artificial):

- **RF-13 (Entrenamientos y rutinas estructuradas):** Modelado de entidades `Workout`, `WorkoutExercise` y definiciones de rutinas tipo CrossFit (WODs) o series de fuerza.
- **RF-14 (Registro de sesiones de entrenamiento):** Modelo `WorkoutResult` para persistir la ejecución de una sesión de entrenamiento completa con tiempos, rondas completadas y cargas utilizadas.
- **RF-15 (Generación automática de marcas personales):** Extracción automatizada de récords personales a partir de los datos registrados en una sesión de entrenamiento, asignando el origen `source = WORKOUT`.
- **RF-16 (Asistente deportivo con IA generativa):** Integración con la API de Google Gemini a través de la frontera `ProgressSnapshotService`, permitiendo contextualizar el historial deportivo del atleta para ofrecer retroalimentación cualitativa y recomendaciones de ajuste de cargas.

## 5.6 Delimitación y exclusiones del alcance (fuera de alcance)

Con el propósito de mantener el rigor y la viabilidad del proyecto de titulación, se ratifica que GarFit está enfocado exclusivamente en el progreso personal del atleta. Quedan explícitamente fuera del alcance del prototipo:
- Módulos de administración comercial para gimnasios (facturación, control de cuotas, membresías, pasarelas de pago recurrentes o puntos de venta / POS).
- Control de acceso físico, biometría dactilar o integración con torniquetes mecánicos.
- Sistemas de reservación de clases grupales y gestión de agendas para entrenadores personales.
- Tablas de clasificación globales (leaderboards públicos), redes sociales de entrenamiento o características de software multi-gimnasio en la nube (SaaS comercial).
