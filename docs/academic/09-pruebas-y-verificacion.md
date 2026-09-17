# 9. Pruebas y verificación

## 9.1 Estrategia y pirámide de pruebas

La estrategia de verificación de GarFit responde a un enfoque multinivel diseñado para validar la integridad del sistema desde las reglas matemáticas básicas hasta los flujos completos de interacción del usuario:

1. **Pruebas unitarias de dominio y transformaciones:** Ubicadas en los paquetes compartidos (`@garfit/domain`, `@garfit/movements`, `@garfit/validation`, `@garfit/api-client`) y bibliotecas de cliente (`apps/web/src/lib`). Evalúan funciones matemáticas puras, conversión de unidades, parseo de filtros, cálculo de progresos y renderizado de geometrías de gráficas SVG, ejecutándose en milisegundos sin requerir servicios externos ni red.
2. **Pruebas de integración HTTP contra base de datos real:** Ubicadas en `apps/api/test/`. Inician una instancia completa de la aplicación NestJS mediante `createTestApp` y efectúan peticiones HTTP a través de Supertest. La persistencia opera contra una base de datos PostgreSQL real dedicada exclusivamente a pruebas (`garfit_test` en puerto `5442`). La función `resetDatabase` purga todas las tablas del esquema antes de cada escenario, garantizando aislamiento estricto y repetibilidad.
3. **Pruebas de extremo a extremo (E2E con Playwright):** Implementadas en `apps/web/e2e/`. Ejecutan un navegador Chromium automatizado sobre las versiones de producción compiladas de la API y la aplicación web, validando la interacción real del atleta: llenado de formularios, navegación perimetral protegida, sembrado del catálogo, cálculo de marcas y captura inmutable de evidencias visuales.

## 9.2 Inventario consolidado de pruebas

A continuación se detalla el inventario completo de suites y escenarios automatizados activos en el monorepo (143 pruebas en 21 ficheros):

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
