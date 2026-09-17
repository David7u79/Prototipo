# 9. Pruebas y verificación

## 9.1 Estrategia

La verificación combina unidades de paquetes, integración HTTP contra PostgreSQL real y revisión de comportamiento de navegador. La API se inicializa con una base de prueba distinta y cada caso reinicia datos; esto prueba el contrato HTTP, Prisma y reglas de autenticación conjuntamente. Las pruebas de web y paquetes aíslan funciones y cliente fetch. La verificación manual de navegador debe complementar, no sustituir, las pruebas automatizadas.

## 9.2 Inventario de pruebas

| Archivo | Describe | Escenarios |
| --- | --- | --- |
| apps/api/test/auth.spec.ts | autenticación local | registro, validación, login, me, refresh, expiración, logout, proveedores |
| apps/api/test/google-auth.spec.ts | POST /auth/google | configuración, token, correo verificado, vínculo y duplicados |
| apps/api/test/health.spec.ts | GET /health | salud con base disponible |
| apps/api/test/profile.spec.ts | GET y PUT /profile | token, crear, leer, actualizar, validación y aislamiento |
| apps/api/test/releases.spec.ts | releases Android | última publicada, descarga, borradores y rutas maliciosas |
| apps/api/src/releases/storage/local-release-storage.spec.ts | LocalReleaseStorage | claves peligrosas, lectura y enlaces |
| apps/web/src/lib/auth-utils.test.ts | safeNext, authErrorMessage | redirección local y mensajes |
| packages/validation/src/index.test.ts | esquemas de validación | normalización, contraseña y enums |
| packages/api-client/src/index.test.ts | cliente API | Authorization, 204, errores y latest |

## 9.3 Comandos y criterios

Se ejecutan pnpm test en apps/api, packages/validation, packages/api-client y apps/web. Para API deben existir DATABASE_URL, TEST_DATABASE_URL y JWT_ACCESS_SECRET y PostgreSQL debe estar disponible. Como validaciones complementarias se usan pnpm lint, pnpm typecheck, pnpm build y node scripts/docs/generate.mjs --check. La prueba pasa si Vitest informa cero fallos; el resultado de la ejecución registrada está en la evidencia de fase 1.

La comprobación manual de navegador debe documentar registro, login, perfil, logout y protección de rutas; para móvil debe documentar restauración de sesión y refresh en Development Build. No se declara que esos recorridos manuales hayan sido ejecutados sin una captura y metadatos.

## 9.4 Alcance de cada nivel

Las pruebas de paquetes verifican transformaciones pequeñas y comportamiento de borde. validation confirma normalización de correo, longitud de contraseña y valores de enumeraciones. api-client confirma que Authorization se agrega sólo a llamadas autenticadas, que una respuesta 204 no se interpreta como JSON y que errores de red adquieren una forma uniforme. Estas pruebas no levantan una API ni prueban navegador, por lo que su utilidad está en contratos locales.

Las pruebas de API son integración. createTestApp inicia los módulos NestJS y utiliza Prisma contra TEST_DATABASE_URL; resetDatabase elimina datos entre casos. auth.spec comprueba que el hash comienza como argon2id, que correo duplicado no cambia por capitalización y que fallos de login no revelan si el correo existe. También comprueba que un access token manipulado no autoriza me y que el refresh rotado deja de servir.

google-auth.spec sustituye GoogleIdentityVerifier por un verificador falso para probar reglas propias sin depender de red Google. Esto permite comprobar configuración ausente, correo no verificado, vínculo por sub y el caso de una cuenta local no verificada. No valida firmas reales de Google en esta prueba; esa tarea pertenece al verificador y a una prueba controlada de integración externa si se incorpora.

releases.spec usa un almacenamiento temporal y datos reales para verificar que el contrato público oculta borradores y archivos ausentes. local-release-storage.spec cubre traversal, rutas absolutas, separadores y enlaces. El caso de symlink se omite cuando Windows no permite crearlo, condición que debe quedar visible al interpretar el resultado. Los comandos no sustituyen análisis de seguridad independiente ni pruebas de carga.

## 9.5 Repetibilidad y datos de prueba

La repetibilidad depende de registrar el commit, versiones de herramientas, variables mínimas y estado de PostgreSQL. El repositorio no debe confiar en el estado dejado por una prueba anterior: los casos de integración limpian las tablas entre escenarios. Esta práctica evita que el resultado de registro afecte por accidente la prueba de correo duplicado o la de perfil aislado. También permite que un fallo se relacione con un escenario concreto en lugar de depender del orden completo de la suite.

Los datos usados en pruebas son cuentas ficticias como ana@example.com. No se deben reemplazar por correos reales ni incluir tokens resultantes en documentación. La evidencia registra conteos de Vitest y no credenciales. Si se agrega una prueba de navegador, debe seguir el mismo principio: crear datos de prueba, limpiar el entorno y conservar una captura que no revele secretos o información personal.

La prueba de salud confirma que API puede consultar PostgreSQL en el entorno de test; no es una prueba de recuperación ante caída. La prueba de almacenamiento confirma que claves peligrosas se rechazan; no es una auditoría completa del sistema de archivos. Expresar estos límites facilita que la próxima fase agregue pruebas de carga, seguridad, migración o integración externa sin reinterpretar el alcance del conjunto actual.
