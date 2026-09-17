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

El script `evidence:web` compila las dependencias de la aplicación web, ejecuta el escenario `athlete-flow.spec.ts` sobre Chromium headless y deposita las capturas generadas en `docs/evidence/generated/`. Las evidencias oficiales consolidadas se preservan de forma inmutable en `docs/evidence/fase-2/capturas/`.

## 11.6 Diagnóstico y resolución de problemas frecuentes

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
