# 10. Resultados

## 10.1 Evidencia cuantitativa y verificación de ejecución

En apego a los principios de honestidad y rigor académico que rigen este trabajo de titulación, los resultados presentados a continuación corresponden exclusivamente a los hechos verificados por el orquestador en fecha **2026-09-16**, sobre la rama `fase-2-dominio` y el commit inmutable `b5030e697a49c3068469f4299534cde05006b0b3`.

### 10.1.1 Ejecución de pruebas automatizadas

La totalidad de los comandos de prueba automatizados ejecutados en el monorepo concluyeron con código de salida 0, sin fallos ni omisiones registradas:

| Paquete / Aplicación | Ficheros | Escenarios pasados | Total ejecutado | Tasa de éxito |
| --- | ---: | ---: | ---: | ---: |
| `apps/api` | 13 | 79 | 79 | 100.00 % |
| `packages/domain` | 3 | 32 | 32 | 100.00 % |
| `packages/movements` | 1 | 8 | 8 | 100.00 % |
| `apps/web` | 2 | 15 | 15 | 100.00 % |
| `packages/api-client` | 1 | 5 | 5 | 100.00 % |
| `packages/validation` | 1 | 4 | 4 | 100.00 % |
| **Total monorepo** | **21** | **143** | **143** | **100.00 %** |

Las 79 pruebas de `apps/api` corresponden a pruebas de integración real ejecutadas sobre una instancia dedicada de PostgreSQL (`localhost:5442/garfit_test`).

### 10.1.2 Cobertura de código

Los porcentajes de cobertura del código fuente se extraen directamente del reporte generado inmutable [`docs/generated/coverage/SUMMARY.md`](../generated/coverage/SUMMARY.md):

| Paquete / Aplicación | Líneas | Sentencias | Funciones | Ramas |
| --- | ---: | ---: | ---: | ---: |
| `apps/api` | 97.05 % | 95.58 % | 96.02 % | 79.15 % |
| `packages/domain` | 100.00 % | 100.00 % | 100.00 % | 96.59 % |
| `packages/movements` | 100.00 % | 100.00 % | 100.00 % | 92.85 % |
| `packages/api-client` | 58.49 % | 61.66 % | 38.46 % | 65.00 % |
| `packages/validation` | 34.88 % | 34.09 % | 0.00 % | 0.00 % |
| `apps/web` | 13.62 % | 14.21 % | 13.20 % | 12.01 % |

*Análisis de la cobertura:*
- Los paquetes de lógica deportiva `@garfit/domain` y `@garfit/movements` presentan una cobertura de líneas del 100.00 %, asegurando que la totalidad de los algoritmos de cálculo de marcas, conversiones y taxonomía están cubiertos por pruebas unitarias.
- En `apps/api`, la cobertura de líneas del 97.05 % confirma una integración exhaustiva sobre controladores, servicios y mapeadores.
- En `apps/web`, el valor de 13.62 % responde a que se audita el directorio completo `src`; los componentes interactivos de página no se cubren con pruebas unitarias sintéticas, sino mediante pruebas de extremo a extremo (E2E) con navegador real.
- *Deuda técnica identificada:* los nuevos esquemas de Zod incorporados en `packages/validation` y los nuevos métodos de consumo REST en `packages/api-client` no cuentan con pruebas unitarias dedicadas en esta fase, sustentándose provisionalmente en su uso integrado por la API y la aplicación web.

### 10.1.3 Verificación de extremo a extremo (E2E) y evidencia visual

La ejecución del comando `pnpm evidence:web` (ejecutado con la API y la aplicación web compiladas en modo producción y la base de datos sembrada) concluyó con **1 prueba pasada** (1 passed, ~14 s de duración).

El recorrido validó el ciclo de vida completo del atleta: registro, creación de perfil, navegación por el dashboard vacío, búsqueda en el catálogo ("barbell full squat"), consulta de la ficha del ejercicio, captura de la primera marca (100 kg en 1RM hace 60 días), captura de la segunda marca (105 kg en 1RM hace 10 días), verificación del historial con mejor marca (105 kg), cálculo visual de progreso (+5 kg), renderizado de la gráfica SVG (`role="img"`) y retorno al dashboard con el contador actualizado a 1 movimiento con marca.

El proceso produjo 9 capturas visuales inmutables archivadas en [`docs/evidence/fase-2/capturas/`](../evidence/fase-2/capturas/):
1. `01-login.png`: Acceso inicial a la plataforma.
2. `02-dashboard-empty.png`: Panel del atleta recién creado sin marcas registradas.
3. `03-profile.png`: Perfil deportivo configurado con confirmación visual.
4. `04-movements.png`: Catálogo de ejercicios filtrado por el término buscado.
5. `05-movement-detail.png`: Ficha del ejercicio con instrucciones en español y músculos involucrados.
6. `06-record-form.png`: Captura de la primera marca personal en el formulario web.
7. `07-records.png`: Vista consolidada de marcas activas con tarjetas de ejercicio.
8. `08-record-history.png`: Historial cronológico con cálculo del incremento (+5 kg) y curva SVG.
9. `09-dashboard.png`: Panel principal actualizado con la métrica de marcas activas.

### 10.1.4 Integridad de siembra del catálogo

- La ejecución de `pnpm db:seed` cargó los **1319 movimientos** transformados a partir de `hasaneyldrm/exercises-dataset` (commit `7455efae41b330c265e7cd4b78dfa848e7ce5ebd`, licencia MIT, sin media comercial de *Gym visual ©*).
- Se comprobó la idempotencia del proceso en dos ejecuciones consecutivas: la primera creó 1319 registros; la segunda reportó 0 creados y 1319 actualizados en un tiempo aproximado de 6 segundos.
- La semilla de demostración (`pnpm db:seed:demo`) verificó sus candados de seguridad: se rehúsa a ejecutarse si `NODE_ENV === 'production'` y exige que `DEMO_USER_PASSWORD` posea una longitud mínima de 8 caracteres.

### 10.1.5 Compilación y análisis estático

- `pnpm lint`: Código de salida 0 (ESLint 9 con reglas de React y TypeScript activas en todo el monorepo).
- `pnpm typecheck`: Código de salida 0 (11 tareas de TypeScript completadas sin discrepancias de tipos).
- `pnpm build`: Código de salida 0 (5 tareas de compilación finalizadas con éxito).
- `pnpm docs:generate` y `pnpm docs:check`: Código de salida 0 (OpenAPI y ERD generados sin diferencias respecto a las versiones archivadas en Git).
- Aplicación móvil Expo: la ejecución de `npx expo export --platform android` finalizó con código 0, confirmando la validez sintáctica y empaquetado del bundle móvil para Android.

## 10.2 Defectos identificados y corregidos durante la fase

En cumplimiento de un reporte académico transparente, se documentan los cinco defectos técnicos reales que fueron detectados durante el ciclo de integración y corregidos oportunamente en el código fuente:

1. **Aceptación errónea de peticiones vacías en `PATCH /records/:id`:**
   - *Comportamiento anómalo:* El endpoint de corrección respondía con código HTTP 200 ante una petición con cuerpo vacío (`{}`), sin efectuar cambios pero confirmando una operación inexistente.
   - *Corrección:* Se introdujo una regla de validación en `UpdateRecordDto` que exige al menos un atributo modificable y obliga a enviar `value` y `unit` de forma conjunta para recalcular el valor normalizado canónico.
2. **Asimetría matemática en empates negativos en `roundTo`:**
   - *Comportamiento anómalo:* La función de redondeo `roundTo` redondeaba los empates en valores negativos hacia infinito positivo (p. ej., `-6.25` se redondeaba a `-6.2` en lugar de `-6.3`), provocando que una mejora y una desmejora de idéntica magnitud se proyectaran con valores numéricos dispares.
   - *Corrección:* Se rediseñó el algoritmo para aplicar redondeo con alejamiento simétrico de cero (`Math.round(Math.abs(v) * f) / f`), preservando el signo original del valor.
3. **Desbordamiento vertical de la gráfica SVG en la interfaz web:**
   - *Comportamiento anómalo:* El componente de visualización de evolución (`progress-chart.tsx`) carecía de un contenedor con relación de aspecto estricta, lo que provocaba que al expandirse al 100 % del ancho del contenedor en ciertas resoluciones, la gráfica creciera desproporcionadamente en altura hasta alcanzar ~870 píxeles.
   - *Corrección:* Se ajustaron las dimensiones del lienzo a un formato apaisado (`CHART.width / CHART.height >= 2`) y se aplicaron clases de contención en Tailwind (`w-full max-w-2xl aspect-[2/1]`) para fijar una escala visual balanceada.
4. **Contaminación de cobertura en pruebas unitarias web por el spec de Playwright:**
   - *Comportamiento anómalo:* El ejecutor de pruebas Vitest en `apps/web` recogía por error el archivo de prueba E2E `athlete-flow.spec.ts` dentro de su alcance, falseando las métricas de cobertura y demandando servicios externos durante la ejecución de pruebas unitarias.
   - *Corrección:* Se refinó la propiedad `exclude` en `vitest.config.ts` de `apps/web` para ignorar de manera explícita la carpeta `e2e/**`.
5. **Falsos positivos de tipado estático en la aplicación móvil Expo:**
   - *Comportamiento anómalo:* La tarea `pnpm typecheck` reportaba errores espurios de TypeScript en `apps/mobile` debido a definiciones obsoletas de rutas en el archivo generado de Expo Router.
   - *Corrección:* Se ejecutó la regeneración limpia de las definiciones de rutas de Expo (`expo-env.d.ts`), sincronizando los tipos de rutas con la estructura de directorios real de `(app)`.

## 10.3 Resumen de evaluación contra requerimientos

| Requerimiento | Estado declarado | Evidencia verificada | Resultado |
| --- | --- | --- | --- |
| RF-01 a RF-04 (Fase 1) | Implementado | Pruebas de integración HTTP en `apps/api/test/` | Pasa |
| RF-05 (Búsqueda y filtros de movimientos) | Implementado | `movements.spec.ts` (11 escenarios pasados) | Pasa |
| RF-06 (Detalle de movimiento e instrucciones) | Implementado | `movements.spec.ts` (3 escenarios pasados) | Pasa |
| RF-07 (Registro de marcas personales) | Implementado | `records.spec.ts` (11 escenarios pasados) | Pasa |
| RF-08 (Corrección y borrado lógico) | Implementado | `records.spec.ts` (4 escenarios pasados) | Pasa |
| RF-09 (Historial, evolución y series) | Implementado | `records.spec.ts`, `records.test.ts`, captura `08-record-history.png` | Pasa |
| RF-10 (Resumen en panel de control) | Implementado | `records.spec.ts`, captura `09-dashboard.png` | Pasa |
| RF-11 (Perfil deportivo ampliado) | Implementado | `profile-extended.spec.ts` (7 escenarios pasados) | Pasa |
| RF-12 (Experiencia multiplataforma) | Implementado | E2E Playwright (1 passed); Expo export (código 0) | Pasa en web; Móvil PENDIENTE en dispositivo |
| RF-13 a RF-16 (Fase 3: WODs, IA) | Planeado | Sin código ni pruebas asociadas en esta fase | PENDIENTE |
| RNF-06 (Manejo canónico de unidades) | Implementado | `units.test.ts` (9 escenarios pasados) | Pasa |
| RNF-07 (Cálculo determinista sin IA) | Implementado | `records.test.ts`, `progress-snapshot.spec.ts` | Pasa |
| RNF-08 (Aislamiento entre usuarios) | Implementado | `records-isolation.spec.ts` (3 escenarios pasados) | Pasa |
| RNF-09 (Borrado lógico para auditoría) | Implementado | `records.spec.ts` (verificación de `deletedAt`) | Pasa |
| RNF-10 (Límites y validación estricta) | Implementado | `records.spec.ts`, `profile-extended.spec.ts` | Pasa |
| RNF-11 (Reglas únicas en `@garfit/domain`) | Implementado | `shared-enums.spec.ts` (paridad con Prisma) | Pasa |
| RNF-12 (Catálogo reproducible y licencia) | Implementado | `movements.test.ts`, `movements-seed.spec.ts` | Pasa |

## 10.4 Limitaciones y aspectos no evaluados (PENDIENTE)

## 10.5 Resultados de la fase 3

Al cierre del 17 de septiembre de 2026 se ejecutaron 195 pruebas: API 102/102 en 18 ficheros, dominio 43, web 20, validación 11, movimientos 10 y cliente API 9. La cobertura de líneas fue API 96.66 %, dominio 93.66 %, movimientos 100 %, validación 92.78 %, cliente API 87.87 % y web 10.06 %; esta última mide todo `src`, por lo que las pantallas se verificaron además con E2E.

Playwright ejecutó dos flujos contra API y web compiladas. El flujo de entrenamiento recorrió dos sesiones de fuerza (100 y 105 kg, con primera marca y mejora de +5 kg), historial, origen no editable y un `FOR_TIME` de 5:30. La prueba API confirmó 100 kg como primera marca, 105 kg como mejora frente a 100, empate sin marca y `409 RECORD_MANAGED_BY_WORKOUT` al intentar modificar una marca derivada. La semilla idempotente cargó 1319 movimientos, siete curados y seis WODs; la semilla demo creó tres entrenamientos completados con una, una y dos marcas derivadas.

No se midieron usuarios reales ni se verificó el móvil en dispositivo o emulador, por lo que ambos resultados permanecen PENDIENTES.

En concordancia con los principios del trabajo de titulación, se declara explícitamente como **PENDIENTE**:

> **PENDIENTE:**
> 1. **Evaluación con usuarios reales:** No se han realizado pruebas de usabilidad, pruebas de campo ni encuestas de satisfacción con atletas de la comunidad universitaria.
> 2. **Pruebas en dispositivos móviles físicos:** La aplicación móvil no ha sido ejecutada en terminales Android ni iOS físicas; su verificación se restringe al análisis estático, tipado de TypeScript y exportación de artefactos con Expo.
> 3. **Pruebas automatizadas E2E en móvil:** No existen pruebas de instrumentación con Appium, Maestro o Detox para el cliente móvil.
> 4. **Pruebas de rendimiento bajo concurrencia:** No se han ejecutado pruebas de estrés (K6, JMeter) para evaluar el comportamiento de la API y PostgreSQL bajo alta concurrencia de atletas.
> 
> *Responsables del seguimiento:* Tesista y director de tesis.

## 10.6 Resultados de la fase 4

La fase 4 cerró con 244 pruebas: API 120, dominio 55, web 30, cliente API 15, validación 14 y movimientos 10. La cobertura de líneas fue API 94.61 %, dominio 93.78 %, movimientos 100 %, validación 93.39 %, cliente API 89.04 % y web 10.71 %. Playwright ejecutó cuatro flujos con el proveedor simulado y sin Internet: atleta, entrenamiento, IA y WOD.

La comprobación de API con el proveedor simulado confirmó que sin consentimiento se recibe `AI_CONSENT_REQUIRED`; sin datos se obtiene `INSUFFICIENT_DATA` sin llamada al proveedor; con datos aparecen observaciones y evidencia resuelta; y una segunda petición idéntica indica caché. También se verificaron las explicaciones de WOD y movimiento. La semilla demo usa cinco entrenamientos completados dentro de los últimos 28 días y cinco marcas manuales.

Durante la fase se corrigieron: salida con esquema JSON vacío, validación casera en lugar de Zod, importaciones ausentes que impedían iniciar API, timeout informado como respuesta inválida, extracción fallida de contexto por el proveedor simulado, fecha ISO que rompía web, etiqueta accesible truncada y fechas fijas de semilla que dejaban vacío el progreso.

Permanecen PENDIENTES la prueba real con Gemini, pues el smoke devolvió `SKIPPED — GEMINI_API_KEY not configured`, y la validación en dispositivo Android, pues no había dispositivo ni emulador. También quedan la advertencia de `pg` en la semilla concurrente, cobertura unitaria web baja, límite por instancia sin almacén compartido, ausencia de historial y falta de botón para forzar regeneración.

## 10.10 Resultados de la fase 5

La fase cerró con 287 pruebas: API 129, dominio 76, web 39, cliente API 19, validación 14 y movimientos 10. La cobertura de líneas fue API 95.03 %, dominio 94.35 %, movimientos 100 %, validación 93.39 %, cliente API 89.74 % y web 12.43 %. Los siete E2E con proveedor simulado pasaron: athlete-flow, workout-flow, ai-flow, wod-flow, ai-history, wod-performance y landing-download. OpenAPI registró 35 rutas con esquemas en todas sus respuestas 2xx.

Se verificó un APK `com.garfit.app` 0.5.0, `versionCode` 5, `minSdkVersion` 24 y `targetSdkVersion` 36, de 104 931 518 bytes, firmado V2 con `CN=Android Debug`. Su SHA-256 fue `e4eabfe20c7dd44d4ef0ca6d448b2ff98f03caf13e4ae7559166cb8f95846bd5`; las descargas versionada y estable coincidieron con ese valor. Para Fran hubo dos intentos, mejor 4:48 y cambio −42 s (−12.73 %).

Se corrigieron el QR fijo que no codificaba una URL, la memoria insuficiente de Gradle, el bloqueo asociado a la compilación Gradle, la expectativa de estadísticas y la omisión de unidad al capturar carga o distancia. Permanecen PENDIENTES Gemini real, instalación en dispositivo y Google OAuth; también se reconocen el aviso de `pg` aguas arriba, la baja cobertura unitaria web, el límite de IA por instancia, la URL de API incorporada al APK y la firma de depuración.
