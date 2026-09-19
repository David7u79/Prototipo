# 11. Manual de operación

## 11.1 Requisitos del sistema e instalación

Para ejecutar y operar GarFit en un entorno local de desarrollo o evaluación, el equipo anfitrión debe cumplir con los siguientes requisitos:

- **Node.js:** Versión `>=22.12.0` (probado satisfactoriamente sobre Node 24).
- **pnpm:** Versión `11.20.0` (gestor de paquetes obligatorio del monorepo; configurado en `packageManager`).
- **Docker y Docker Compose:** Para la gestión del motor de base de datos relacional PostgreSQL 17.
- **Navegador Chromium para Playwright:** Para la ejecución del flujo de pruebas E2E y generación de evidencias visuales.

### Instalación de dependencias

Desde la raíz del repositorio, ejecute:

```sh
pnpm install
```

Este comando resuelve el árbol de dependencias para todas las aplicaciones (`api`, `web`, `mobile`, `landing`) y paquetes compartidos (`domain`, `movements`, `types`, `validation`, `api-client`, `config`) respetando el bloqueo de versiones en `pnpm-lock.yaml`.

## 11.2 Configuración de variables de entorno

Copie los archivos de ejemplo en cada espacio de trabajo antes de iniciar los servicios (nunca versione archivos `.env` reales con secretos):

```sh
cp apps/api/.env.example apps/api/.env
cp apps/landing/.env.example apps/landing/.env
cp apps/mobile/.env.example apps/mobile/.env
```

| Aplicación | Variable | Descripción y valor de desarrollo típico |
| --- | --- | --- |
| `apps/api` | `DATABASE_URL` | Conexión a la base principal: `postgresql://postgres:postgres@localhost:5442/garfit?schema=public` |
| `apps/api` | `TEST_DATABASE_URL` | Conexión a la base de pruebas: `postgresql://postgres:postgres@localhost:5442/garfit_test?schema=public` |
| `apps/api` | `JWT_ACCESS_SECRET` | Secreto de firma criptográfica HMAC-SHA256 para tokens de acceso (mínimo 32 caracteres). |
| `apps/api` | `DEMO_USER_PASSWORD` | Contraseña obligatoria para la siembra del usuario de demostración (`pnpm db:seed:demo`). |
| `apps/api` | `CORS_ORIGINS` | Orígenes web autorizados: `http://localhost:3000,http://localhost:4321` |
| `apps/api` | `GOOGLE_WEB_CLIENT_ID` | Identificador de cliente OAuth 2.0 Web para Google (opcional en desarrollo). |
| `apps/api` | `GEMINI_API_KEY` | Clave secreta para la API de Google Gemini (delimitada exclusivamente al backend). |
| `apps/landing` | `PUBLIC_WEB_APP_URL` | URL de la aplicación web del atleta: `http://localhost:3000` |
| `apps/landing` | `PUBLIC_API_URL` | URL de la API para consultar releases: `http://localhost:4000` |
| `apps/mobile` | `EXPO_PUBLIC_API_URL` | URL accesible desde el emulador: `http://10.0.2.2:4000` (Android) o `http://localhost:4000` (iOS). |

## 11.3 Puesta en marcha de la infraestructura y servicios

### 1. Inicialización de la base de datos

Inicie el contenedor de PostgreSQL 17 mapeado al puerto local `5442` y aplique las migraciones de Prisma:

```sh
pnpm db:up
pnpm db:migrate
```

*Nota:* `docker-compose.yml` inicializa automáticamente las dos bases de datos requeridas: `garfit` (desarrollo) y `garfit_test` (pruebas automatizadas).

### 2. Siembra del catálogo de movimientos

Antes de que los atletas puedan registrar marcas personales, la base de datos debe contener el catálogo deportivo estandarizado:

```sh
pnpm db:seed
```

Este comando compila las dependencias necesarias de la API y ejecuta `apps/api/src/cli/seed-movements.ts`. Carga de manera idempotente **1319 movimientos** transformados en la tabla `Movement` a partir del catálogo inmutable (`packages/movements/data/catalog.json`). Si el comando se ejecuta nuevamente, detecta que los registros ya existen y actualiza su contenido sin duplicar (`0 creados, 1319 actualizados` en ~6 segundos).

### 3. Siembra del atleta de demostración (opcional)

Para poblar la base de datos con un atleta de prueba equipado con historial cronológico y marcas en múltiples ejercicios:

```sh
DEMO_USER_PASSWORD="UnaContraseñaSegura123" pnpm db:seed:demo
```

El script genera el usuario `demo@garfit.example` con perfil deportivo y 8 marcas calculadas en sentadilla con barra, press de banca, flexiones y plancha. Este script se bloquea automáticamente si `NODE_ENV === 'production'`.

### 4. Ejecución del entorno de desarrollo

Para iniciar simultáneamente la API NestJS, la aplicación web Next.js y la landing page Astro:

```sh
pnpm dev
```

Puertos de escucha asignados:
- **API NestJS:** `http://localhost:4000` (Swagger disponible en `/api/docs` si `SWAGGER_ENABLED=true`).
- **Aplicación Web:** `http://localhost:3000`
- **Landing Page:** `http://localhost:4321`

*Comportamiento de Astro 7:* Cuando la landing page detecta que se ejecuta en una sesión no interactiva o ante agentes de inteligencia artificial, se inicia en segundo plano sin bloquear la terminal; en consolas humanas interactivas, corre en primer plano permitiendo acceder a los atajos de teclado de Astro.

### 5. Ejecución de la aplicación móvil Expo

Debido a que el empaquetador Metro de Expo demanda una consola interactiva para renderizar códigos QR y seleccionar emuladores de desarrollo, la aplicación móvil se inicia en una terminal independiente:

```sh
pnpm dev:mobile
```

La consola de Metro escuchará en `http://localhost:8081`.

### 6. Scripts individuales por aplicación

Si se desea operar únicamente un componente específico del monorepo:
- `pnpm dev:api`: Inicia únicamente la API NestJS y recompila paquetes en modo observación.
- `pnpm dev:web`: Inicia únicamente la aplicación web del atleta.
- `pnpm dev:landing`: Inicia únicamente el portal informativo de la landing.

## 11.4 Guía operativa: flujo del atleta en la interfaz web

Para interactuar con el dominio deportivo de la fase 2 a través de la aplicación web (`http://localhost:3000`):

1. **Registro e inicio de sesión:**
   - Ingrese a `http://localhost:3000/register`.
   - Complete el nombre, correo electrónico y contraseña (mínimo 8 caracteres).
   - Tras enviar el formulario, el sistema inicia la sesión de forma transparente mediante cookies `httpOnly` y redirige a la vista obligatoria de perfil.
2. **Configuración del perfil deportivo:**
   - En `http://localhost:3000/app/profile`, establezca el nombre público, nivel de experiencia y objetivo principal.
   - Seleccione el sistema de unidades preferido (`Métrico (kg, cm)` o `Imperial (lb, in)`).
   - Opcionalmente capture fecha de nacimiento, estatura y peso corporal.
   - Haga clic en "Guardar perfil".
3. **Exploración del catálogo de movimientos:**
   - Navegue a `http://localhost:3000/app/movements`.
   - Utilice la barra de búsqueda para localizar ejercicios por nombre (p. ej., "barbell full squat").
   - Utilice los menús desplegables para filtrar por equipamiento (p. ej., "Barra") o región corporal (p. ej., "Piernas").
   - Haga clic en cualquier tarjeta de ejercicio para abrir su ficha técnica (`/app/movements/:slug`), donde podrá consultar las instrucciones paso a paso en español, músculos involucrados y tipos de marca admitidos.
4. **Registro de marcas personales:**
   - Desde la ficha del movimiento, haga clic en el botón "Registrar una marca", o acceda directamente a `http://localhost:3000/app/records/new`.
   - Si ingresa desde la ruta directa, utilice el buscador interactivo para seleccionar el ejercicio.
   - Seleccione el tipo de marca correspondiente (p. ej., `Carga (peso)`).
   - Introduzca el valor numérico en la unidad de su preferencia (p. ej., `100` en `kg`).
   - Para marcas de peso, capture el número de repeticiones (`1` para 1RM).
   - Seleccione la fecha en que se realizó el esfuerzo (no se admiten fechas futuras) y añada notas opcionales.
   - Haga clic en "Guardar marca".
5. **Consulta de historial y evolución:**
   - Acceda a `http://localhost:3000/app/records` ("Mis marcas") para ver las tarjetas de resumen de todos los movimientos trabajados.
   - Haga clic en "Ver historial" sobre un ejercicio (`/app/records/:movementSlug`) para examinar la progresión cronológica, la mejor marca alcanzada, el cambio relativo respecto al intento anterior (+X kg) y la curva visual renderizada en la gráfica SVG.
6. **Corrección o retiro de una marca:**
   - Desde el listado del historial, haga clic en "Editar" junto a la marca deseada (`/app/records/:movementSlug/:id/edit`).
   - Para corregir un error de captura, modifique el valor o unidad y pulse "Guardar cambios".
   - Para retirar una marca errónea, pulse el botón "Retirar marca". El sistema aplicará borrado lógico (`deletedAt`), excluyendo la marca de los cálculos sin destruir el registro físico.

## 11.5 Generación de evidencias y pruebas de extremo a extremo (E2E)

Para ejecutar la verificación E2E automatizada que reproduce el recorrido completo del atleta y captura evidencia visual auditable:

### 1. Instalación previa de Chromium (sólo la primera vez)

```sh
pnpm exec playwright install chromium
```

### 2. Ejecución de la suite de evidencias

Asegúrese de que la base de datos esté activa, el catálogo sembrado (`pnpm db:seed`) y compile los artefactos de producción:

```sh
pnpm build
pnpm evidence:web
```

El script `evidence:web` compila las dependencias de la aplicación web y ejecuta los ocho recorridos de Playwright sobre Chromium headless: `athlete-flow.spec.ts`, `workout-flow.spec.ts`, `ai-flow.spec.ts`, `wod-flow.spec.ts`, `ai-history.spec.ts`, `wod-performance.spec.ts`, `landing-download.spec.ts` y `presentation-captures.spec.ts`. Conviene arrancar la API con `NODE_ENV=test` para esas ejecuciones: encadenar varios recorridos supera el límite de diez peticiones de autenticación por minuto. Las evidencias oficiales consolidadas se preservan de forma inmutable en `docs/evidence/fase-5/capturas/`.

## 11.6 Diagnóstico y resolución de problemas frecuentes

## 11.7 Operación de entrenamientos y WODs (fase 3)

Después de ejecutar `pnpm db:seed`, el catálogo incluye los movimientos curados y los seis WODs benchmark. Para una demostración con sesiones ya cerradas se usa `DEMO_USER_PASSWORD="UnaContraseñaSegura123" pnpm db:seed:demo`. El recorrido web comienza en **Entrenamientos**: seleccione **Nuevo entrenamiento**, escriba nombre y tipo, busque movimientos, complete la prescripción por tipo y guarde. Para partir de plantilla, abra **WODs**, consulte un benchmark o WOD propio y cree la sesión desde esa prescripción.

En el detalle de un borrador seleccione **Empezar**. Registre cada serie con sus repeticiones y, cuando aplique, carga, distancia o duración. En `FOR_TIME` capture el tiempo o las repeticiones al límite; en `AMRAP`, rondas y repeticiones; en `EMOM`, el indicador de completado. Seleccione **Completar** sólo después de proporcionar el resultado exigido. El sistema fija la sesión y calcula volumen, score y marcas de forma automática.

Una tarjeta **Primera marca** indica que no había una mejor marca comparable. Una presentación como **115 → 120 kg** indica mejora; el enlace **Origen** lleva a la sesión y serie que la generó. La leyenda **Gestionada por entrenamiento** explica por qué no se muestran Editar ni Retirar: para corregir una serie completada se elimina el entrenamiento, que retira lógicamente sus marcas derivadas, y se registra de nuevo. En **Historial** se filtra por estado y se abre el detalle; el panel de inicio muestra actividad, volumen y sesiones recientes.

La aplicación móvil ofrece el mismo flujo desde las pestañas Entrenar, Historial e Inicio y las rutas de WODs y Workouts. Su compilación y validación estática concluyeron correctamente, pero la operación en dispositivo permanece formalmente PENDIENTE. A continuación se desglosa la guía operativa paso a paso para el ciclo completo de entrenamientos y WODs.

### 11.7.1 Preparación del entorno y datos de prueba (semillas)

Para operar y evaluar el módulo deportivo de entrenamientos y plantillas WOD, el sistema requiere la inicialización de los catálogos y, opcionalmente, de un atleta con historial precargado:

1. **Siembra del catálogo unificado (`pnpm db:seed`):**
   - Ejecute desde la raíz del monorepo: `pnpm db:seed`.
   - Este comando compila las dependencias e invoca `apps/api/src/cli/seed-movements.ts`.
   - Carga de forma estrictamente idempotente los **1319 movimientos** estándar del catálogo inmutable (`packages/movements/data/catalog.json`), asegurando su disponibilidad en la tabla `Movement`.
   - Siembra los **7 movimientos curados** por GarFit (`packages/movements/src/curated.ts`), identificados con `CURATED_SOURCE = 'garfit'`: `rowing-ergometer`, `air-squat`, `wall-ball`, `box-jump`, `double-under`, `toes-to-bar` y `barbell-clean-and-jerk`.
   - Siembra los **6 WODs benchmark** públicos de referencia (`packages/movements/src/benchmark-wods.ts`), identificados con `BENCHMARK_SOURCE = 'garfit-benchmarks'`: `fran`, `grace`, `helen`, `diane`, `karen` y `cindy`, vinculando sus ejercicios a los movimientos correspondientes con sus esquemas y cargas estándar.
2. **Siembra del atleta de demostración (`pnpm db:seed:demo`):**
   - Ejecute: `DEMO_USER_PASSWORD="UnaContraseñaSegura123" pnpm db:seed:demo`.
   - Inicializa el usuario `demo@garfit.example` con credenciales locales, perfil deportivo intermedio en sistema métrico y 5 marcas manuales históricas (press de banca con 75 y 80 kg, flexiones con 30 y 38 repeticiones, y plancha abdominal con 60 segundos).
   - Genera mediante llamadas reales a `WorkoutsService` **tres sesiones de entrenamiento completadas**: dos entrenamientos de fuerza en sentadilla (`barbell-full-squat`) a 100 kg y 105 kg, y una sesión de cardio (`run`) de 5 km en 1420 segundos.
   - Estas sesiones derivan automáticamente 1, 1 y 2 marcas personales en la base de datos (incluyendo marcas de carga `WEIGHT` y marcas de `TIME` y `DISTANCE` para cardio).

### 11.7.2 Creación de un entrenamiento libre en la interfaz web

Para construir una sesión de entrenamiento personalizada desde la aplicación web (`http://localhost:3000`):

1. **Acceso a la sección de entrenamientos:**
   - Inicie sesión y navegue a `http://localhost:3000/app/workouts` mediante el enlace "Entrenamientos" de la barra de navegación principal.
   
   ![Listado general de entrenamientos](../evidence/fase-3/capturas/10-workouts-list.png)
   *Figura 11.1: Listado de entrenamientos del atleta con accesos para creación libre y consulta de plantillas WOD.*

2. **Apertura del constructor de entrenamientos:**
   - En la esquina superior derecha, haga clic en el botón "Nuevo entrenamiento" para ingresar a la ruta `/app/workouts/new`. La vista monta el componente `WorkoutBuilder`.
3. **Definición de metadatos básicos:**
   - En el campo **Nombre** (`name="name"`), introduzca el título descriptivo de la sesión (p. ej., "Fuerza A" o "Metcon Matutino").
   - En el selector desplegable **Tipo** (`select name="workoutType"`), elija la modalidad de entrenamiento deseada: Fuerza (`STRENGTH`), Por tiempo (`FOR_TIME`), AMRAP (`AMRAP`), EMOM (`EMOM`), Cardio (`CARDIO`) o Personalizado (`CUSTOM`).
4. **Configuración de la prescripción global (`Prescription`):**
   - Según el tipo seleccionado, el formulario despliega dinámicamente los campos correspondientes:
     - En `FOR_TIME`: campo opcional "Límite (s)" (`durationSeconds`) para fijar el corte de tiempo (*time cap*), y campo opcional "Esquema" (`repScheme`, p. ej., `21-15-9`).
     - En `AMRAP`: campo obligatorio "Duración (s)" (`durationSeconds`) y campo opcional "Rondas" (`rounds`).
     - En `EMOM`: campos obligatorios "Duración (s)" (`durationSeconds`) e "Intervalo (s)" (`intervalSeconds`), exigiendo que la duración sea múltiplo entero del intervalo.
     - En `CUSTOM`: campo opcional "Esquema" (`repScheme`).
     - En `STRENGTH` y `CARDIO`: no aplican parámetros globales, ya que la prescripción se define individualmente por ejercicio.
5. **Búsqueda y agregación de ejercicios:**
   - En la sección "Ejercicios", introduzca al menos dos caracteres en el campo "Buscar movimiento".
   - El componente ejecuta una consulta con retardo (*debounce*) a `/app/workouts/movement-search?q=...` y muestra la lista de coincidencias con su categoría anatómica y tipos de marca admitidos.
   - Haga clic sobre el movimiento deseado (p. ej., `barbell full squat`) para añadirlo al entrenamiento.
6. **Configuración de las series objetivo (`ExerciseEditor`):**
   - Para cada ejercicio añadido, establezca el objetivo prescrito:
     - "Series" (`targetSets`) y "Repeticiones" (`targetReps`).
     - Si el ejercicio admite marcas de peso (`WEIGHT`): introduzca "Carga" (`targetLoadValue`) y seleccione la unidad en "Unidad de carga" (`targetLoadUnit`: `KILOGRAM` o `POUND`).
     - Si admite distancia o tiempo (`DISTANCE` / `TIME`): defina "Distancia" (`targetDistanceValue`) y "Unidad de distancia" (`targetDistanceUnit`: `METER`, `KILOMETER` o `MILE`), o "Duración (s)" (`targetDurationSeconds`).
     - Ajuste el orden de ejecución mediante los botones "Subir" y "Bajar", o elimine un ejercicio con "Quitar".
7. **Guardado del borrador:**
   - Haga clic en el botón "Guardar entrenamiento".
   - La Server Action `createWorkout` valida los datos con `createWorkoutSchema`, persiste la sesión en estado borrador (`DRAFT`) y redirige automáticamente al detalle del entrenamiento (`/app/workouts/:id`).

   ![Constructor de entrenamientos](../evidence/fase-3/capturas/11-workout-builder.png)
   *Figura 11.2: Formulario del constructor de entrenamiento con prescripción estructurada de ejercicios.*

### 11.7.3 Creación de un entrenamiento a partir de un WOD predefinido

Para iniciar un entrenamiento reutilizando una plantilla del catálogo público o privado:

1. **Navegación al catálogo de WODs:**
   - Desde `/app/workouts`, haga clic en el enlace "Desde un WOD" o navegue directamente a `http://localhost:3000/app/wods`.
2. **Exploración y filtrado de plantillas:**
   - Utilice la barra de búsqueda para filtrar por nombre (p. ej., "Fran") o el desplegable para seleccionar por tipo (`workoutType`).
   - La lista presenta primero los WODs de referencia con el distintivo "Benchmark" y posteriormente los WODs personales del usuario.
3. **Inspección de la ficha técnica:**
   - Haga clic en el enlace del WOD deseado para abrir `/app/wods/:slug`.
   - Consulte la prescripción consolidada (esquema de repeticiones, número de rondas o duración programada) y el listado de movimientos con sus cargas o repeticiones estándar.
4. **Instanciación de la sesión:**
   - Pulse el botón "Usar este WOD".
   - La Server Action `useWod` envía una solicitud a la API creando un entrenamiento clonado en estado borrador (`DRAFT`) con todos los ejercicios y parámetros del WOD, redirigiendo de inmediato a `/app/workouts/:id`.

### 11.7.4 Inicio de la sesión y registro de series y score por tipo

Una vez creado el entrenamiento en borrador, el atleta procede a ejecutarlo y registrar su desempeño real:

1. **Puesta en marcha del entrenamiento:**
   - En la vista del detalle `/app/workouts/:id`, haga clic en el botón "Empezar".
   - La acción `startWorkout` envía `POST /workouts/:id/start`, registrando la fecha y hora de inicio (`startedAt`) y actualizando el estado a en curso (`IN_PROGRESS`).

   ![Sesión de entrenamiento en curso](../evidence/fase-3/capturas/12-workout-active.png)
   *Figura 11.3: Vista de entrenamiento activo con formulario dinámico para la captura de series y score.*

2. **Captura de series ejecutadas (`ExerciseRows`):**
   - Para cada ejercicio prescrito, capture los valores reales conseguidos:
     - En el campo "Reps", ingrese el número entero de repeticiones completadas.
     - En el campo "kg" (o carga), capture el peso levantado.
     - En el campo "Distancia", registre los metros completados si aplica.
     - Utilice el botón "Añadir serie" para registrar series adicionales, o "Quitar" para descartar las series no realizadas.
3. **Registro del resultado global (`Score`):**
   - Dependiendo del tipo de sesión, el formulario presenta los campos validados por `validateScore`:
     - En `FOR_TIME`: capture en el campo "Tiempo (mm:ss)" la marca cronometrada (p. ej., `05:30`). Si se alcanzó el tiempo límite (*time cap*), se capturan las repeticiones logradas al corte; `validateScore` prohíbe registrar simultáneamente tiempo y repeticiones al corte.
     - En `AMRAP`: introduzca el número entero de "Rondas" completas y, en su caso, las repeticiones de la ronda incompleta en "Reps extra".
     - En `EMOM`: seleccione en el grupo "¿Completaste todos los intervalos?" la opción "Sí" o "No" (`completed`).
     - En `STRENGTH`, `CARDIO` y `CUSTOM`: no aplica score global; el resumen principal se deriva automáticamente de las series ejecutadas mediante `summarizeSets` (volumen total en kg para fuerza y mayor distancia/duración en cardio).
4. **Guardado parcial (opcional):**
   - Durante la sesión, puede pulsar "Guardar resultados" (`saveWorkoutResults`). El sistema ejecuta `PUT /workouts/:id/results`, normalizando las series a valores canónicos en la base de datos sin finalizar la sesión.

### 11.7.5 Finalización del entrenamiento y gestión de errores

Al concluir la totalidad del trabajo físico:

1. **Envío de la finalización:**
   - Haga clic en el botón principal "Completar" para invocar la Server Action `completeWorkout`.
   - La acción valida los datos con `workoutResultsSchema` y envía `POST /workouts/:id/complete`.
2. **Validación de completitud y error 422 (`WORKOUT_INCOMPLETE`):**
   - El servicio de backend verifica que se hayan suministrado los resultados obligatorios mínimos antes de cerrar la sesión. Si faltan datos, la API rechaza la petición con código HTTP 422, código de error `WORKOUT_INCOMPLETE` y los mensajes textuales correspondientes:
     - En `STRENGTH`: `"Registra al menos una serie con repeticiones"`.
     - En `CARDIO`: `"Registra al menos una serie con distancia o duración"`.
     - En `FOR_TIME`: `"Indica el tiempo, o las repeticiones si se alcanzó el tiempo límite"`.
     - En `AMRAP`: `"Indica las rondas completadas"`.
     - En `EMOM`: `"Indica si completaste todos los intervalos"`.
3. **Control de transiciones y error 409 (`WORKOUT_INVALID_STATE`):**
   - Si se intenta ejecutar una acción no permitida para el estado actual de la sesión (p. ej., intentar editar un entrenamiento que ya no está en `DRAFT`, o invocar `start` sobre una sesión ya completada), la API responde con código HTTP 409, código `WORKOUT_INVALID_STATE` y el mensaje literal:
     - `"La acción no está permitida en este estado"`.
4. **Cierre exitoso y persistencia:**
   - Superadas las validaciones, el backend ejecuta una transacción atómica que fija `status = 'COMPLETED'`, asigna `completedAt = now()`, establece la fecha de realización `performedOn` y redirige a la vista de confirmación.

   ![Entrenamiento completado](../evidence/fase-3/capturas/13-workout-completed.png)
   *Figura 11.4: Resumen de sesión completada con cálculo de volumen total y derivación de marcas personales.*

### 11.7.6 Interpretación de marcas automáticas y trazabilidad de origen

Al finalizar una sesión de fuerza o cardio, GarFit evalúa automáticamente si alguna serie ejecutada constituye una nueva marca personal:

1. **Detección de primera marca:**
   - Si el atleta no contaba con ningún registro histórico comparable en dicho ejercicio y número de repeticiones (o distancia), el sistema crea la marca en la tabla `PersonalRecord` y la presenta en la interfaz con la etiqueta **Primera marca**.
2. **Formato de mejora ("antes → después"):**
   - Si ya existía una marca previa y la serie ejecutada la supera estrictamente, la interfaz proyecta la progresión en formato antes → después, indicando la mejora relativa conseguida:
     - Ejemplo: **115 → 120 kg** (con el incremento calculado `· +5 kg`).

   ![Detalle del entrenamiento con incremento de marca](../evidence/fase-3/capturas/14-workout-detail.png)
   *Figura 11.5: Vista de detalle de la sesión completada reflejando la mejora sobre la marca personal anterior.*

3. **Trazabilidad mediante el enlace "Origen":**
   - Al hacer clic sobre cualquier marca personal, el sistema abre la vista del historial del ejercicio (`/app/records/:movementSlug`).
   - Las marcas originadas en una sesión muestran la sección **Origen**, detallando el nombre del entrenamiento generador (p. ej., "Fuerza B"), la fecha de realización y la serie precisa (`setNumber: 1`) con sus repeticiones.
4. **Protección contra edición directa ("Gestionada por entrenamiento"):**
   - Las marcas automáticas muestran la leyenda informativa **Gestionada por entrenamiento** y ocultan deliberadamente los botones "Editar" y "Retirar".
   - Si un cliente intenta modificar o suprimir la marca directamente (`PATCH /records/:id` o `DELETE /records/:id`), el backend la rechaza con código HTTP 409 y código `RECORD_MANAGED_BY_WORKOUT`:
     - Mensaje: `"Esta marca proviene de un entrenamiento: gestiónala desde el entrenamiento"`.
     - *Justificación técnica:* Se asegura que el valor de la marca coincida exactamente con el registro auditado de la serie deportiva realizada.
5. **Procedimiento de corrección mediante borrado del entrenamiento:**
   - Para enmendar una captura errónea en una sesión completada, navegue a `/app/workouts/:id` y haga clic en el enlace "Borrar entrenamiento".
   - Confirme la acción pulsando "Confirmar borrado". La API ejecuta una transacción que aplica borrado lógico (`deletedAt`) sobre el entrenamiento y retira en cascada todas las marcas personales asociadas a sus series (`workoutResultId`).
   - Las marcas retiradas dejan de contabilizar en el historial y en las mejores marcas. Posteriormente, el atleta puede registrar la sesión nuevamente con los valores correctos.

   ![Detalle de marca personal y trazabilidad de origen](../evidence/fase-3/capturas/15-workout-pr.png)
   *Figura 11.6: Ficha de marca derivada en el historial del atleta con origen trazable y bloqueo de modificación manual.*

### 11.7.7 Consulta de historial, filtros y métricas en el panel de control

Para dar seguimiento al volumen global y la regularidad del entrenamiento:

1. **Navegación al historial de entrenamientos:**
   - Acceda a `/app/workouts`. La interfaz agrupa las sesiones en dos bloques: "Pendientes" (borradores y en curso) e "Historial" (sesiones completadas).

   ![Historial de entrenamientos completados](../evidence/fase-3/capturas/16-history.png)
   *Figura 11.7: Historial de sesiones completadas con filtros por modalidad, estado y fecha.*

2. **Aplicación de filtros de búsqueda:**
   - En el formulario superior de `/app/workouts`, configure los filtros deseados:
     - Selector de tipo: "Todos los tipos", "Fuerza", "Por tiempo", "AMRAP", "EMOM", "Cardio" o "Personalizado".
     - Selector de estado: "Todos los estados", "Borrador", "En curso" o "Completado".
     - Selector de fecha: "Desde" (`input name="from"` en formato fecha).
     - Haga clic en "Filtrar" para actualizar los resultados paginados.
3. **Lectura de tarjetas de sesión:**
   - Cada tarjeta muestra la fecha de ejecución (o estado si está pendiente), modalidad, lista de movimientos participantes, el resumen destacado (`headline`) y el contador de marcas derivadas obtenidas ("X marcas").
4. **Métricas en el panel de inicio (`/app`):**
   - Ingrese al panel principal del atleta para consultar los indicadores agregados:
     - Tarjetas superiores: volumen de sesiones completadas en "Esta semana" (`last7Days`), "Este mes" (`last30Days`), "Movimientos con marca" y "Marcas registradas".
     - Tarjeta "Último entrenamiento": enlace directo con el nombre y headline de la sesión más reciente.
     - Indicador "Marcas desde entrenamientos (30 días)": total de logros derivados directamente de entrenamientos en el último mes.

   ![Dashboard principal con entrenamientos](../evidence/fase-3/capturas/17-dashboard-workouts.png)
   *Figura 11.8: Panel de control del atleta con indicadores de frecuencia, volumen y actividad reciente.*

### 11.7.8 Guía operativa de la aplicación móvil (Expo SDK 57)

La aplicación móvil nativa (`apps/mobile`) replica las capacidades deportivas del cliente web adaptándolas a la pantalla táctil:

1. **Pestaña Inicio (`(tabs)/index.tsx`):**
   - Consume en paralelo `GET /records/summary` y `GET /workouts/stats`.
   - Renderiza el saludo personalizado, las tarjetas de volumen mensual y semanal, el contador de marcas derivadas en los últimos 30 días y el componente `WorkoutSummary` con acceso directo al último entrenamiento registrado.
2. **Pestaña Entrenar (`(tabs)/train.tsx`):**
   - Punto de entrada a la sesión de ejercicio. Ofrece los botones principales de acción "Nuevo entrenamiento" y "Desde un WOD".
   - En la sección "Continúa donde lo dejaste", lista los entrenamientos pendientes en estado borrador (`DRAFT`) o en curso (`IN_PROGRESS`) para reanudar la actividad con un toque.
3. **Constructor de entrenamiento móvil (`workouts/new.tsx`):**
   - Permite capturar el nombre, seleccionar el tipo mediante botones de opción táctil (`Choice`), ingresar parámetros de prescripción global en campos adaptados al teclado numérico (`Field`), seleccionar movimientos desde el catálogo y añadir series personalizadas.
4. **Catálogo de WODs móvil (`wods/index.tsx` y `wods/[slug].tsx`):**
   - Lista los benchmarks oficiales con su prescripción resumida. Al abrir un WOD, el botón "Usar este WOD" clona la estructura hacia un entrenamiento personal mediante `POST /workouts`.
5. **Sesión interactiva y captura táctil (`workouts/[id].tsx`):**
   - Permite transicionar la sesión a en curso ("Empezar"), ingresar repeticiones y cargas de cada serie en `ResultExercise`, registrar scores en `Score` (con botones de incremento `+` y `−` para rondas en AMRAP y conmutador para EMOM) y finalizar pulsando "Completar".
6. **Pestaña Historial móvil (`(tabs)/history.tsx`):**
   - Muestra el listado cronológico de sesiones completadas agrupadas por fecha (`groupWorkouts`) mediante un componente `FlatList` con recarga interactiva (`RefreshControl`) y paginación progresiva (`onEndReached`).
7. **Declaración formal de verificación:**
   - La validez sintáctica, el chequeo estático de tipos con TypeScript y la compilación del bundle para Android (`npx expo export --platform android`) han concluido con código de salida 0; no obstante, la operación interactiva en dispositivo móvil físico o emulador permanece declarada formalmente como **PENDIENTE** debido a la falta de terminales de prueba y entorno AVD en el equipo de desarrollo.

### 11.7.9 Diagnóstico y resolución de problemas observados en fase 3

Durante el desarrollo e integración de la fase 3 se identificaron dos situaciones operativas recurrentes que cuentan con solución documentada:

1. **Definiciones de tipos de rutas de Expo desactualizadas en TypeScript:**
   - *Síntoma:* La tarea `pnpm typecheck` o el editor de código reportan errores de tipado estático en `apps/mobile`, señalando que rutas como `/(app)/workouts/new` o `/(app)/wods/[slug]` no son destinos válidos de navegación.
   - *Causa:* El generador de rutas estáticas de Expo Router no ha actualizado el archivo de tipos `expo-env.d.ts` tras la creación de nuevos archivos de pantalla.
   - *Solución:* Iniciar brevemente el servidor de desarrollo de Metro mediante `pnpm dev:mobile` (o ejecutando `npx expo start`). Expo inspecciona el árbol de carpetas de `(app)` y reescribe automáticamente `expo-env.d.ts` con la totalidad de las rutas válidas.
2. **Aviso informativo del adaptador `@prisma/adapter-pg` al sembrar datos de prueba:**
   - *Síntoma:* Al ejecutar `pnpm db:seed:demo`, la terminal puede emitir mensajes de advertencia de PostgreSQL o del adaptador relativos a conexiones liberadas o cierre del pool de conexiones.
   - *Diagnóstico:* Este aviso es completamente inocuo. Se produce por la secuencia de apagado coordinada entre el contexto de NestJS (`app.close()`) y la desconexión explícita del cliente Prisma (`prisma.$disconnect()`). Todas las transacciones de inserción de usuario, marcas y entrenamientos se completan satisfactoriamente con anterioridad a la emisión del mensaje.

1. **Error: `DATABASE_URL no está definida` o fallo de conexión a PostgreSQL:**
   - Compruebe que el contenedor esté en ejecución mediante `docker ps`.
   - Si el puerto 5442 se encuentra en uso por otro proceso, modifique el mapeo en `docker-compose.yml` y ajuste los puertos correspondientes en `.env`.
2. **Error: `Falta el catálogo: ejecuta pnpm db:seed antes de la semilla demo`:**
   - Ocurre al intentar registrar marcas o ejecutar `pnpm db:seed:demo` sin haber poblado previamente la tabla `Movement`. Ejecute `pnpm db:seed` para inicializar el catálogo de 1319 movimientos.
3. **Error: `DEMO_USER_PASSWORD debe tener al menos 8 caracteres`:**
   - El script `pnpm db:seed:demo` exige una contraseña explícita para el usuario demo. Invoque el comando anteponiendo la variable: `DEMO_USER_PASSWORD="ContraseñaSegura123" pnpm db:seed:demo`.
4. **Error: `La semilla demo no se puede ejecutar en producción`:**
   - Protección de seguridad activada cuando `NODE_ENV === 'production'`. La semilla demo está reservada para entornos de desarrollo y evaluación local.
5. **Fallo de conexión desde el emulador móvil a la API:**
   - Los emuladores de Android no resuelven `localhost` como la máquina anfitriona. Verifique que `EXPO_PUBLIC_API_URL` apunte a `http://10.0.2.2:4000`. Si utiliza un dispositivo físico conectado a la red local, utilice la dirección IP de su máquina en la red LAN (p. ej., `http://192.168.1.150:4000`).

## 11.8 Operación de análisis explicativo (fase 4)

Las capturas de esta sección se tomaron con el proveedor simulado; ilustran el flujo y no acreditan una llamada real a Gemini.

1. Abra la sección IA. Si el servicio está disponible, acepte el consentimiento para permitir el envío de hechos deportivos mínimos. Si no está configurado, la pantalla informa la condición y el resto de GarFit continúa funcionando.
2. Seleccione análisis de progreso y el periodo disponible. Lea el resumen, observaciones y sugerencias; abra la evidencia para identificar los datos que respaldan cada afirmación.
3. Si aparece «Análisis anterior», significa que los mismos datos, modelo y versión de instrucción coincidieron con caché. No es una generación nueva.
4. Seleccione un entrenamiento completado para analizarlo. Los borradores o recursos de otro atleta no son analizables.
5. Seleccione un WOD para consultar su explicación y un movimiento para consultar instrucciones e información interpretada del catálogo.
6. Desde la creación de WOD personal puede preparar una rutina web propia; después puede pedir explicación del WOD guardado.
7. Para revocar permiso, use la acción de revocación. Desde ese momento no se realizan nuevas solicitudes al proveedor.

### 11.8.1 Requisitos previos del servicio

El responsable técnico debe configurar en la API `GEMINI_API_KEY`, `GEMINI_ENABLED`, `AI_PROVIDER`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_PER_MINUTE` y `AI_RATE_LIMIT_PER_DAY`. La clave acredita la llamada a Gemini; `GEMINI_ENABLED` habilita o deshabilita el servicio; `AI_PROVIDER` selecciona `gemini` o `fake`; el tiempo máximo acota la espera, y los dos límites controlan solicitudes por minuto y por día para cada atleta. El proveedor `fake` está destinado a desarrollo y no se admite en producción.

Cuando la pantalla no obtiene un estado disponible, o éste indica que el servicio está desactivado o sin configurar, en `/app/ai` se muestra literalmente «Servicio de análisis no configurado.». No se presenta el consentimiento ni las acciones de IA; las demás funciones de GarFit permanecen operables.

### 11.8.2 Consentimiento en la web

1. Inicie sesión y abra la ruta `/app/ai`.
2. Lea el aviso: «GarFit utiliza Google Gemini para generar análisis. Al solicitar un análisis, los datos deportivos necesarios para esa operación se enviarán al proveedor de IA. No se envían tus credenciales de acceso.»
3. Seleccione «Aceptar y continuar» para registrar el consentimiento, o «Cancelar» para volver a la pantalla anterior sin solicitar ningún análisis.

### 11.8.3 Analizar el progreso

1. En el panel «Analizar mi progreso», abra el selector «Periodo» y elija «30 días», «60 días» o «90 días».
2. Pulse «Analizar mi progreso» y espere a que termine la solicitud.
3. Lea «Resumen» como síntesis prudente; «Observaciones» como interpretaciones respaldadas por hechos; «Sugerencias» como recomendaciones no clínicas; «Datos utilizados» como relación transparente de entradas; y «Limitaciones» como alcance o cautelas de la respuesta. Si no existe material suficiente, el resultado informa que no hay datos suficientes y lista los datos pendientes en vez de simular una conclusión.

### 11.8.4 Leer la evidencia

Cada elemento de «Observaciones» y «Sugerencias» que tenga respaldo incorpora el desplegable «Evidencia». Ábralo para consultar cada hecho con su `label`, su valor, la unidad cuando existe y la fecha cuando existe. Por ejemplo, un hecho de marca puede identificar una serie comparable mediante `pr:back-squat:weight-5rm:best`; el identificador no es una conclusión clínica, sino una referencia estable al dato.

Los valores no los calcula Gemini: GarFit los obtiene de perfil, entrenamientos, marcas, WODs o catálogo, los conserva como hechos verificables y sólo permite que el modelo los cite. Por ello, la evidencia permite comprobar la afirmación contra datos deterministas de la aplicación y no contra un cálculo opaco del modelo.

### 11.8.5 Analizar un entrenamiento completado

Desde `/app/ai`, localice «Analizar mi último entrenamiento», confirme el nombre del último entrenamiento completado y pulse «Analizar mi último entrenamiento». También puede abrir el detalle de un entrenamiento completado y usar «Analizar entrenamiento»; ese botón dirige a `/app/ai?workoutId=<id>` y conserva el entrenamiento elegido. Un entrenamiento en borrador no es analizable: el servicio exige estado `COMPLETED` y comunica que el entrenamiento debe estar completado.

### 11.8.6 Explicar un WOD y un movimiento

En `/app/ai`, seleccione un elemento en «Explicar un WOD» y pulse «Explicar un WOD», o elija uno en «Explicar un movimiento» y pulse «Explicar un movimiento». Como acceso contextual, el detalle de WOD ofrece «Explicar WOD» y el detalle del movimiento ofrece «Explicar con IA»; ambos llevan a `/app/ai` con el `slug` respectivo. La explicación interpreta exclusivamente la prescripción del WOD o la ficha del catálogo recibida por GarFit.

### 11.8.7 Crear un WOD personal

1. Abra `/app/wods/new`, donde aparece «Nuevo WOD», y complete «Nombre», «Tipo» y, si corresponde, «Descripción», «Esquema», «Rondas» y «Duración (s)».
2. En «Movimientos», escriba al menos dos caracteres en «Buscar movimiento» y seleccione el movimiento de la lista devuelta.
3. Para cada movimiento, capture los valores aplicables de «Repeticiones», «Carga», «Unidad de carga», «Distancia», «Unidad de distancia», «Duración (s)» y «Notas». Use «Quitar» si desea excluir una fila.
4. Pulse «Guardar WOD». Una vez guardado, abra su detalle y utilice «Explicar WOD» si requiere la interpretación explicativa.

### 11.8.8 «Análisis anterior»

La etiqueta «Análisis anterior» indica una respuesta recuperada de caché, no una nueva llamada al proveedor. Se reutiliza únicamente si coinciden el conjunto de datos deterministas, la operación y su objetivo, el periodo cuando aplica, el modelo y la versión de la instrucción. Un cambio en los datos, en el modelo o en la versión de instrucción cambia la clave y regenera la respuesta. No existe un botón para forzar la generación: esa ausencia evita consumo innecesario y conserva la trazabilidad entre una respuesta y sus hechos.

### 11.8.9 Revocar el consentimiento

Abra `/app/profile`; si existe consentimiento, en «Análisis con IA» pulse «Revocar consentimiento». La pantalla advierte: «Al revocar el consentimiento, GarFit dejará de enviar tus datos deportivos al proveedor para nuevos análisis.». La revocación impide nuevas solicitudes; no convierte en nuevos análisis ni borra retroactivamente los datos ya registrados por el sistema.

### 11.8.10 Uso en la aplicación móvil

En móvil, la pantalla `/(app)/ai` se abre desde las acciones de detalle «Analizar entrenamiento», «Explicar WOD» o «Explicar con IA», y permite también iniciar el progreso o analizar el último entrenamiento. Conserva el mismo consentimiento, contrato y mensajes de servicio. A diferencia de la web, presenta los periodos «30 días», «60 días» y «90 días» como botones y sólo expone en su pantalla principal progreso y último entrenamiento; las explicaciones se abren desde sus detalles. La validación en dispositivo real sigue **PENDIENTE**.

### 11.8.11 Problemas frecuentes

| Mensaje que ve el atleta | Causa operativa |
| --- | --- |
| «Servicio de análisis no configurado.» | `GEMINI_ENABLED` está desactivado, falta configuración del proveedor o la pantalla no puede obtener el estado. |
| «Necesitas aceptar el consentimiento para continuar.» / «Necesitas aceptar el consentimiento para solicitar un análisis.» | No se registró el consentimiento antes de la solicitud. |
| «El proveedor de IA no está disponible. Inténtalo más tarde.» / «El proveedor de IA no está disponible. Inténtalo de nuevo más tarde.» | El proveedor no respondió, la red falló o agotó el tiempo de espera. |
| «Se alcanzó el límite de solicitudes. Inténtalo más tarde.» / «Se alcanzó el límite de análisis. Inténtalo de nuevo más tarde.» | Se alcanzó `AI_RATE_LIMIT_PER_MINUTE`, `AI_RATE_LIMIT_PER_DAY` o un límite informado por el proveedor. |
| «El proveedor devolvió una respuesta no válida.» / «No se pudo procesar la respuesta del análisis. Inténtalo de nuevo.» | La salida no pudo validarse como JSON estructurado o citó evidencia inexistente. |
| «No hay datos suficientes para generar una respuesta.» | El contexto no alcanzó la regla de datos suficientes; GarFit no llama al proveedor y muestra los datos pendientes. |

![Figura 11.1. Consentimiento de IA](../evidence/fase-4/capturas/ai-consent.png)

*Figura 11.1. Diálogo de consentimiento explícito.*

![Figura 11.2. Panel de IA](../evidence/fase-4/capturas/ai-home.png)

*Figura 11.2. Panel con operaciones disponibles.*

![Figura 11.3. Análisis de progreso](../evidence/fase-4/capturas/ai-progress-analysis.png)

*Figura 11.3. Resultado de progreso y datos usados.*

![Figura 11.4. Evidencia inspeccionable](../evidence/fase-4/capturas/ai-evidence.png)

*Figura 11.4. Evidencia resuelta por GarFit.*

![Figura 11.5. Análisis de entrenamiento](../evidence/fase-4/capturas/ai-workout-analysis.png)

*Figura 11.5. Interpretación de un entrenamiento completado.*

![Figura 11.6. Explicación de WOD](../evidence/fase-4/capturas/ai-wod-explanation.png)

*Figura 11.6. Explicación de WOD.*

![Figura 11.7. Explicación de movimiento](../evidence/fase-4/capturas/ai-movement-explanation.png)

*Figura 11.7. Explicación de movimiento.*

![Figura 11.8. Creación de WOD](../evidence/fase-4/capturas/wod-new.png)

*Figura 11.8. Creación de WOD personal desde web.*

## 11.10 Uso de la distribución y comparaciones de fase 5

### 11.10.1 Descargar GarFit desde la landing

1. Abra la página `Descargar GarFit` y localice la tarjeta Android titulada **Lleva GarFit contigo**.
2. Espere a que termine el mensaje **Consultando la versión disponible…**. La tarjeta informa literalmente `Versión`, el tamaño en MB y `Publicada el` seguido de la fecha de la release.
3. En la página de descarga se muestra además **Notas de la versión**, la lista de cambios y el campo **SHA-256:**. Estos datos proceden de la última versión publicada, no de una selección manual del usuario.
4. Seleccione el enlace **Descargar para Android (versión)**; su destino estable es `/releases/android/latest/download`, por lo que siempre resuelve la última release Android publicada.
5. También puede escanear el código con la indicación **Escanea para descargar en Android**. El QR abre esa misma URL estable `/releases/android/latest/download`; no apunta a un número de versión que pueda quedar obsoleto. Véase la Figura 11.5.

![Figura 11.5. Descarga Android.](../evidence/fase-5/capturas/android-download.png)

*Figura 11.5. Tarjeta Android con versión, tamaño, fecha, enlace de descarga y QR de destino estable.*

### 11.10.2 Instalar el APK en Android

1. Descargue la APK desde el botón disponible de la página, tal como indica **Instalación fuera de Play Store**.
2. Abra el archivo descargado. Cuando Android lo solicite, habilite la instalación desde esta fuente para el navegador o gestor de archivos que utilizó.
3. Vuelva al archivo y siga las indicaciones del sistema para concluir la instalación. La advertencia de origen externo es una protección del sistema operativo: continúe sólo si reconoce el origen y ya verificó el archivo.
4. Esta distribución no se realiza mediante Play Store. La propia página describe el proceso como **Instalación fuera de Play Store** y dice: **Descarga la APK desde el botón disponible**, **Cuando Android lo solicite, habilita la instalación desde esta fuente** y **Abre el archivo descargado y sigue las indicaciones del sistema**. Véase la Figura 11.6.

![Figura 11.6. Información de la release.](../evidence/fase-5/capturas/android-release-info.png)

*Figura 11.6. Notas, SHA-256 e instrucciones de instalación fuera de Play Store de la release publicada.*

### 11.10.3 Comprobar que el archivo es el publicado

1. Antes de instalar, copie el valor presentado tras **SHA-256:** en la landing. Es el hash de la APK publicada.
2. En Windows, abra PowerShell en la carpeta del archivo y ejecute `Get-FileHash .\nombre-del-archivo.apk -Algorithm SHA256`. Compare el valor de `Hash` con el de la landing, sin omitir ni alterar caracteres.
3. En Linux o macOS, ejecute `sha256sum nombre-del-archivo.apk`; en macOS también es válido `shasum -a 256 nombre-del-archivo.apk`. Compare el resultado con el SHA-256 de la landing.
4. Como comprobación adicional de la transferencia, la respuesta de `/releases/android/latest/download` devuelve la cabecera `X-Checksum-Sha256`. Su valor debe coincidir con el mostrado por la landing y con el calculado localmente.
5. Si alguno de los tres valores difiere, no instale el archivo: vuelva a descargarlo desde **Descargar para Android** y repita la comprobación.

### 11.10.4 Consultar y borrar análisis anteriores en la web

1. En la aplicación web abra **Asistente IA**. Debajo del panel aparece la sección **Análisis recientes**.
2. Cada fila muestra un enlace con el tipo y el objetivo (`tipo · objetivo`), la fecha, el resumen y el botón **Borrar análisis**. Para análisis de progreso el objetivo no corresponde a un recurso concreto; para entrenamiento, WOD o movimiento se muestra la etiqueta resuelta del recurso.
3. Seleccione el enlace de una fila para abrir `/app/ai/analyses/:id`. La vista presenta el resultado almacenado, incluida su evidencia, y el enlace **Volver al asistente IA**.
4. Abrir un análisis guardado no solicita una nueva generación: recupera la respuesta, hechos y datos utilizados que se conservaron al crearlo. Así se mantiene trazabilidad y se evita atribuir una respuesta posterior al análisis histórico.
5. Para borrar sólo una fila, pulse **Borrar análisis**, confirme con **Sí, borrar** o cancele con **Cancelar**. Para limpiar la lista completa, use **Borrar todo el historial** y la misma confirmación. Véanse las Figuras 11.1 y 11.2.

![Figura 11.1. Historial de análisis guardados.](../evidence/fase-5/capturas/ai-history.png)

*Figura 11.1. Sección Análisis recientes con tipo, objetivo, fecha, resumen y acciones por entrada.*

![Figura 11.2. Detalle de un análisis guardado.](../evidence/fase-5/capturas/ai-history-detail.png)

*Figura 11.2. Un análisis abierto desde el historial conserva el resultado y la evidencia almacenados.*

### 11.10.5 Consentimiento e historial de IA

1. Revocar el consentimiento impide solicitar análisis nuevos hasta volver a aceptarlo.
2. La revocación no borra automáticamente los análisis anteriores: el historial ya guardado permanece disponible para el mismo usuario, conforme a la política de retención de fase 5.
3. Si desea retirar esas respuestas conservadas, use **Borrar análisis** en una entrada o **Borrar todo el historial** antes o después de revocar el consentimiento. La limpieza se aplica únicamente al historial de la cuenta autenticada.

### 11.10.6 Leer «Tu rendimiento» de un WOD

1. Abra el detalle del WOD. La tarjeta **Tu rendimiento** aparece cuando la comparación está disponible.
2. **Mejor** es la mejor ejecución histórica comparable; **Último** es la más reciente; **Anterior** es la inmediatamente previa; y **Cambio** compara únicamente las dos últimas, con valor, unidad y porcentaje cuando éste existe.
3. La unidad depende del WOD: FOR_TIME compara segundos (menos es mejor), AMRAP compara repeticiones totales y STRENGTH compara volumen en kg. La gráfica **Evolución de resultados del WOD** representa cronológicamente los intentos comparables; sólo se dibuja con más de un resultado.
4. Con una sola ejecución habrá mejor y último, pero no anterior ni cambio. Con cero resultados aparece **Aún no hay resultados comparables.**
5. Si no hay comparación disponible, no infiera una mejora: lea el motivo mostrado. Puede deberse a que EMOM sólo registra completitud, AMRAP no tiene un esquema de repeticiones conocido o el tipo no dispone de una magnitud comparable. Véase la Figura 11.3.

![Figura 11.3. Comparación de rendimiento de WOD.](../evidence/fase-5/capturas/wod-performance.png)

*Figura 11.3. Tarjeta Tu rendimiento con mejor, último, anterior, cambio y evolución cronológica.*

### 11.10.7 Leer la comparación de periodos del panel de inicio

1. En el inicio, identifique **Comparación de periodos**. El subtítulo precisa: **Últimos 30 días frente a los 30 días anteriores.**
2. Para **Entrenamientos**, **Días entrenados**, **Volumen (kg)** y **Marcas**, cada tarjeta expone **Actual**, **Anterior** y **Diferencia**.
3. Lea la diferencia como la resta entre ambas ventanas equivalentes; el porcentaje puede no estar disponible si el periodo anterior es cero. No expresa diagnóstico, calidad de entrenamiento ni una calificación deportiva: son diferencias descriptivas. Véase la Figura 11.4.

![Figura 11.4. Comparación de periodos.](../evidence/fase-5/capturas/period-comparison.png)

*Figura 11.4. Panel de inicio con diferencias descriptivas entre ventanas consecutivas de 30 días.*

### 11.10.8 Consulta equivalente en la aplicación móvil

1. En móvil abra **Análisis inteligente**. Tras el consentimiento, el bloque **Análisis anteriores** muestra tipo, fecha, `targetLabel` o **Mi progreso**, y hasta tres líneas de resumen.
2. Toque una entrada con la etiqueta accesible **Abrir análisis de tipo** para cargar el resultado guardado; éste se identifica como **Análisis anterior** cuando procede de historial. El botón **Borrar** elimina una entrada y **Cargar más** continúa la paginación.
3. La aplicación móvil ofrece los controles **30 días**, **60 días** y **90 días** en **Analizar mi progreso**, además de **Analizar mi último entrenamiento**. El resultado conserva **Resumen**, **Observaciones**, **Sugerencias**, **Datos utilizados** y **Limitaciones**.
4. La paridad visual y funcional de estas pantallas en un dispositivo Android físico queda **PENDIENTE de validar en dispositivo**. La documentación no afirma una validación de instalación, QR, historial o renderizado móvil fuera de los controles automatizados disponibles.

1. Abra la landing de GarFit y elija la descarga Android de la release publicada. Revise versión, fecha, notas, tamaño y SHA-256 antes de descargar.
2. Abra el APK descargado. Android pedirá aceptar la advertencia para instalar desde esa fuente; habilite el permiso para el navegador o gestor de archivos y continúe sólo si reconoce el origen.
3. En la información de la aplicación compruebe la versión `0.9.0-rc.1` y `versionCode` 6. Para una verificación técnica, calcule SHA-256 del archivo y contraste el valor mostrado por la landing para esa release; no use valores históricos de capturas de fases anteriores.
4. En Análisis, abra el historial para consultar un resultado previo; hacerlo no solicita un nuevo análisis. Use la acción de borrado de una entrada o del historial completo cuando corresponda.
5. En el detalle de un WOD, lea intentos, mejor, último y cambio. Si no existe una comparación numérica, lea el motivo mostrado en lugar de inferir una mejora.
6. En estadísticas de entrenamientos, contraste el periodo actual con el anterior. Los cambios son descriptivos y no son una calificación deportiva.

![Figura 11.1. Historial de análisis guardados.](../evidence/fase-5/capturas/ai-history.png)

*Figura 11.1. Consulta del historial de análisis de IA.*

![Figura 11.2. Detalle de un análisis guardado.](../evidence/fase-5/capturas/ai-history-detail.png)

*Figura 11.2. Un análisis abierto conserva sus hechos y no regenera una respuesta.*

![Figura 11.3. Comparación de rendimiento de WOD.](../evidence/fase-5/capturas/wod-performance.png)

*Figura 11.3. Visualización de intentos y cambio en un WOD.*

![Figura 11.4. Comparación de periodos.](../evidence/fase-5/capturas/period-comparison.png)

*Figura 11.4. Comparación descriptiva entre ventanas de entrenamiento.*

![Figura 11.5. Descarga Android.](../evidence/fase-5/capturas/android-download.png)

*Figura 11.5. Landing con descarga, integridad y QR estable.*

![Figura 11.6. Información de la release.](../evidence/fase-5/capturas/android-release-info.png)

*Figura 11.6. Metadatos de la release Android publicada.*
