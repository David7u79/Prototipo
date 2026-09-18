# Revisión final de seguridad del candidato a lanzamiento

Esta evidencia procede de lectura de código del worktree y comandos ejecutados el 18-09-2026. No se reproducen secretos. El grafo no pudo consultarse porque el conector exigía aprobación; se emplearon búsquedas locales.

## 1. Autenticación local

Se leyeron `apps/api/src/auth/auth.service.ts`, `auth.controller.ts`, `dto/auth.dto.ts` y `packages/domain/src/rules.ts`. Registro usa Argon2id (`algorithm: 2`); no fija parámetros en la llamada. El hash ficticio de login codifica `m=19456,t=2,p=1` y se verifica aunque el usuario no exista. Contraseña queda en 8--128, nombre en 80 y correo se normaliza con `trim().toLowerCase()` e `IsEmail`. `CREDENTIALS_THROTTLE` limita registro, login, Google y refresh a 10/60 000 ms.

**Veredicto: parcial.** Login retorna siempre `INVALID_CREDENTIALS`, pero alta devuelve 409 `EMAIL_ALREADY_REGISTERED`: revela existencia. El throttle mitiga enumeración; para eliminarla se requiere respuesta indistinguible y confirmación de correo.

## 2. JWT y sesiones

`auth.module.ts` configura `JWT_ACCESS_SECRET`; `issueSession` firma HS256 con TTL configurable (900 s por defecto). `jwt.strategy.ts` admite sólo HS256 y caducidad. Refresh aleatorio de 32 bytes se almacena sólo como SHA-256 y expira en 30 días por defecto. Rotar revoca condicionalmente la sesión antes de emitir otra; reutilizar una revocada, también por carrera, revoca todas las sesiones. Logout revoca el hash.

**Veredicto: conforme en código.** Un Bearer robado vive hasta 15 minutos; revocación consultada por petición eliminaría ese residual.

## 3. Cookies de la web

`apps/web/src/lib/auth.ts` guarda ambos tokens sólo con `next/headers`: `HttpOnly`, `SameSite=Lax`, `path=/` y `Secure` en producción. Access usa TTL firmado y refresh fecha absoluta; cierre expira ambos. El lector es `serverApi`, que llama `cookies()` en servidor. **Veredicto: conforme.** No hay acceso JavaScript cliente. Lax queda mitigado por Bearer y CORS sin credenciales.

## 4. Google OAuth

`google-identity.verifier.ts` usa `OAuth2Client.verifyIdToken` en servidor con ID web y audiencias extra; `auth.service.ts` exige correo verificado. No hay client secret: valida ID token; `/auth/providers` expone sólo ID público. En `apps/api/.env.example` y `.env` leídos, Google y audiencias extra están vacíos. **Veredicto: conforme para diseño; no operativo hasta configurar ID público.** No hay credenciales reales Google configuradas.

## 5. Aislamiento por atleta

`records.service.ts` limita por `userId`; `workouts.service.ts` requiere `id`, `userId` y no borrado; `wods.service.ts` permite global o propietario y filtra intentos por usuario. `ai.service.ts` limita historial, detalle, borrado, caché y objetivos por usuario JWT. Se verificó con búsqueda local la existencia de **4/4** pruebas:

| Prueba | Garantía comprobada por lectura |
| --- | --- |
| `records-isolation.spec.ts` | Sin lectura, edición ni borrado de marca ajena. |
| `ai-security.spec.ts` | WOD/entrenamiento privados y caché no cruzan atletas. |
| `ai-history.spec.ts` | Detalle y borrado de análisis ajenos dan 404. |
| `wod-performance.spec.ts` | Sólo cuenta intentos propios, completos y no borrados. |

Se intentó ejecutar la suite: Vitest falló antes de aserciones al resolver Prisma generado y `@garfit/domain`. **Veredicto: conforme por inspección; pendiente de CI con artefactos generados.**

## 6. Descargas y almacenamiento de releases

`releases.service.ts` admite SemVer, consulta sólo Android publicado y toma clave desde BD. `local-release-storage.ts` rechaza vacío, `.`, `..`, barra inversa, `%`, absolutos y caracteres no permitidos; además comprueba ruta real dentro de raíz contra enlaces simbólicos. Borradores llevan `published:true`. El controlador sanea nombre y emite `X-Checksum-Sha256`. `.gitignore` excluye `storage/releases/android/*`, salvo `.gitkeep`.

**Veredicto: conforme por código e ignore.** `git ls-files` normal no pudo confirmar índice por propiedad Git dudosa del sandbox; queda pendiente.

## 7. Capa de IA

`AiController` exige JWT y `AiService.process` exige `aiConsentAt` o responde 403. El contexto se minimiza: `ai-security.spec.ts` confirma que no se envían correo, nombre, fecha de nacimiento ni ID, aunque sí hechos necesarios. La salida JSON se valida con `aiModelOutputSchema`, reintentando y rechazando evidencia inexistente. El límite es 5/minuto y 100/día por usuario. `gemini-ai.provider.ts` obtiene clave sólo con `ConfigService`; no la devuelve ni la registra, y sus logs propios incluyen tipo, modelo y duración.

**Veredicto: conforme en código.** El contador es memoria por instancia; un contador atómico compartido elimina el residual distribuido.

## 8. Inyección de instrucciones

`ai-prompt.ts` serializa hechos, escapa `<` y los delimita como `<garfit_data>`, declarando que son datos y nunca instrucciones. La prueba de notas maliciosas en `ai-security.spec.ts` comprueba delimitador, minimización y que la respuesta no adopta la afirmación inyectada. **Veredicto: conforme por código y cobertura leída; ejecución bloqueada por artefactos ausentes.**

## 9. CORS y cabeceras

`common/setup-app.ts` usa `CORS_ORIGINS` y `credentials:false`. `validateEnvironment` rechaza en producción lista vacía o `*`; entorno local lista puertos 3000, 4321 y 8081. No se halló Helmet ni configuración equivalente en bootstrap. **Veredicto: CORS conforme, endurecimiento HTTP parcial.** Debe verificarse proxy productivo o añadirse política y pruebas.

## 10. Gestión de secretos

`.gitignore` ignora `.env`, sus variantes, los keystores y las propiedades de firma; el ejemplo de la
API deja vacíos JWT, Google y Gemini. `pnpm security:scan` detecta un valor de `JWT_ACCESS_SECRET`
en `apps/api/.env:8`, que es el fichero de configuración **local** de la máquina de desarrollo. Se
comprobó que ese fichero nunca ha estado en el repositorio:

```text
$ git check-ignore -v apps/api/.env
.gitignore:16:.env      apps/api/.env
$ git ls-files --error-unmatch apps/api/.env
error: pathspec 'apps/api/.env' did not match any file(s) known to git
$ git log --all -- apps/api/.env      # sin resultados: nunca se versionó
```

El barrido clasifica los hallazgos: los de ficheros ignorados por Git se informan pero no fallan, y
sólo un secreto en un fichero versionado hace fallar la comprobación. Hoy termina así:

```text
local (ignorado por Git) apps/api/.env:8 variable secreta
OK: sin secretos versionados. 1 hallazgo(s) en ficheros locales ignorados por Git.
```

El keystore de firma y su contraseña viven fuera del repositorio
([procedimiento](../../operations/android-signing.md)); ningún artefacto generado contiene claves.

**Veredicto: conforme.** Ningún secreto está versionado ni aparece en la documentación, en las
capturas o en los artefactos generados. Riesgo residual: la configuración local depende de la
disciplina de quien desarrolla; el barrido se ejecuta en CI para detectarlo si eso cambiara.

## 11. Dependencias

`pnpm.cmd audit` terminó con cinco avisos: 2 altos y 3 moderados.

| Severidad | Paquete/ruta audit | ¿Producción observada? |
| --- | --- | --- |
| Alta | `deepmerge-ts <8`, bajo `prisma`/`@prisma/config`. | Herramienta Prisma; sin ruta de aplicación observada, aunque instalada en API. |
| Alta/moderada | `mysql2`, bajo Prisma. | No se observó MySQL: entorno y app usan PostgreSQL; sigue instalado. |
| Moderada | `uuid`, bajo Expo CLI/config/xcode. | Herramientas móvil, no importación API/web observada. |
| Moderada | `decode-uri-component`, bajo Expo CLI/router. | Herramientas Expo, no ruta API/web observada. |

**Veredicto: aceptable para el prototipo, con seguimiento.** Tras retirar `@nestjs/mau` —una
dependencia de desarrollo sin uso— el recuento pasó de 22 avisos (7 altos) a 5 (2 altos, 3
moderados), todos en cadenas de herramientas de desarrollo (CLI de Prisma y de Expo) que no forman
parte del código desplegado. No se actualizó ninguna otra dependencia: hacerlo sin necesidad real
arriesgaría la compilación a cambio de un recuento cosmético.

## 12. Validación de entrada

Acciones web en `apps/web/src/app/*-actions.ts` usan Zod `safeParse`; esquemas compartidos son estrictos y limitan tipos, enumerados, textos, ejercicios/series y paginación (máximo 50; página 10 000). DTO API usa `class-validator`; `setup-app.ts` instala `ValidationPipe` con whitelist, prohibición de extras y transformación: fuera de rango/campo extra se rechaza. Se confirmaron contraseña 8--128, nombre 80 y `WORKOUT_LIMITS`. Búsqueda de `bodyParser`, `express.json` y análogos no halló máximo explícito HTTP.

**Veredicto: conforme por campo; parcial por payload total.** Debe fijarse y probarse máximo de request en API o proxy.

## Riesgos residuales priorizados

| Prioridad | Riesgo | Mitigación actual | Para eliminarlo |
| --- | --- | --- | --- |
| Media | El secreto JWT vive en el `.env` local de cada máquina. | El fichero está ignorado por Git y nunca se ha versionado (comprobado); el barrido lo distingue de un secreto versionado y CI lo ejecuta. | Gestor de secretos del entorno de despliegue y rotación periódica. |
| Alta | Enumeración de correo en alta. | 10/minuto. | Respuesta indistinguible y verificación. |
| Media | Avisos en dependencias transitivas de herramientas de desarrollo (CLI de Prisma y de Expo). | No entran en el código que se ejecuta en producción: la API usa PostgreSQL con `@prisma/adapter-pg` y nunca `mysql2`. Durante esta fase se retiró `@nestjs/mau`, una dependencia de desarrollo sin uso que aportaba 17 avisos. | Actualizar cuando el proveedor publique versiones corregidas, comprobando que no rompen la compilación. |
| Media | Límite IA no distribuido. | Contador local. | Almacén atómico compartido. |
| Media | Sin máximo HTTP explícito. | Límites de campos. | Límite y prueba de payload. |
| Media | Access válido hasta expiración. | TTL 900 s. | Revocación por petición. |
| Baja | Cabeceras no visibles en Nest. | CORS restringido. | Política Nest/proxy verificada. |

## Lo que esta revisión NO cubre

No sustituye auditoría externa, pentest ni revisión criptográfica formal. No cubre TLS, infraestructura real, carga, DoS, concurrencia distribuida ni recuperación. Las pruebas citadas no obtuvieron resultado verde por Prisma y workspaces no resolubles; se reportan como cobertura leída, no ejecución verde.
