# Bitácora de producción

Registro de hallazgos y cambios sobre la instancia pública, para el documento final. Cada entrada
dice qué se comprobó, con qué y qué se cambió. Lo no verificado se marca como tal.

## Infraestructura (estado al 2026-10-27)

| Elemento | Valor |
| --- | --- |
| Servidor | VPS `produccion`, gestionado con Coolify (recurso `garfit-demo`) |
| Despliegue | `docker-compose.demo.yml` desde la rama `main` |
| API | `https://garfit-api.da-bit.cloud` |
| Web | `https://garfit-app.da-bit.cloud` |
| Landing | `https://garfit.da-bit.cloud` |
| Cadena de red | cliente → Cloudflare → Traefik (`coolify-proxy`) → contenedor |
| IA | `AI_PROVIDER=fake`, `GEMINI_ENABLED=false` |
| Google OAuth | Desactivado; el compose no pasa `GOOGLE_WEB_CLIENT_ID` a la API |

## 2026-10-27

### Recorrido en emulador Android

APK release contra la API pública, recorrido completo. Detalle y capturas en
[`docs/evidence/final/emulador-2026-10-27.md`](../evidence/final/emulador-2026-10-27.md).

### Límite de peticiones compartido por todos los usuarios

- **Hallazgo.** La API recibía todas las conexiones desde Traefik (`::ffff:10.0.2.2`); el
  `ThrottlerGuard` contaba por esa IP, así que los usuarios compartían 100 peticiones/min.
  Confirmado en el servidor: `x-ratelimit-remaining` bajaba con peticiones de orígenes distintos.
- **Agravante.** El móvil repetía peticiones en bucle en catálogo e historial.
- **Cambio.** `ClientIpThrottlerGuard` (API) y guardas con `useRef` (móvil). Commits `23b4588`,
  `b4dab76`.

### Puertos publicados en el servidor

- **Hallazgo.** El compose publicaba API, web y landing en todas las interfaces del VPS
  (p. ej. `0.0.0.0:14000->4000`), accesibles sin pasar por Cloudflare ni Traefik.
- **Cambio.** Los tres puertos se publican sólo en `127.0.0.1` en `docker-compose.demo.yml`.

### Copias de seguridad de PostgreSQL

- **Hallazgo.** PostgreSQL va dentro del compose, no como base de datos gestionada por Coolify:
  no había copias programadas.
- **Estado.** Pendiente; ver la entrada de despliegue.

### El push a `main` no redespliega (2026-10-28)

- **Hallazgo.** Tras empujar `0429180` (rediseño, datos del reloj, migración
  `WorkoutBiometrics`), a los 20 min la API seguía sirviendo la versión anterior:
  `PUT /workouts/:id/biometrics` → 404 mientras `GET /workouts` → 401. No apareció ningún
  contenedor nuevo de GarFit en el VPS; los de web y landing tienen 9 días.
- **Causa.** `garfit-demo` se dio de alta con la fuente "Public GitHub" (`source_id=0`), que no
  recibe eventos de push. El resto de proyectos usan la GitHub App `coolify-da-bit`, que es la
  que entrega el webhook. El último despliegue real era del 2026-10-19 (`e105008`), así que el
  push del 27-10 tampoco había entrado.
- **Cambio.** Fuente cambiada a la GitHub App `coolify-da-bit` (`source_id=1`) y redespliegue
  `opr2rvewe5na6avelkgh33ns` con `fd1a3ef`: migración `20261028120000_workout_biometrics`
  aplicada, mismo volumen de PostgreSQL, `PUT /workouts/:id/biometrics` → 401.
- **Revertir.** `UPDATE applications SET source_id=0, repository_project_id=NULL WHERE id=20;`

## Pendientes conocidos

- Traefik acepta tráfico directo a la IP del VPS sin pasar por Cloudflare. Restringirlo afecta a
  todos los servicios del servidor, no sólo a GarFit.
- Teléfono Android físico: descarga desde la landing e instalación.
- Gemini real y Google OAuth real: requieren credenciales.
