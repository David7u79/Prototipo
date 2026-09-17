# 5. Requerimientos

## 5.1 Criterio de especificación

Cada requerimiento de fase 1 se formula con actor, comportamiento, criterio de aceptación verificable, prioridad y estado. “Implementado” significa que existe código y evidencia identificable en [TRACEABILITY](../TRACEABILITY.md); no significa que haya sido evaluado con usuarios reales.

| ID | Descripción, actor y aceptación | Prioridad | Estado |
| --- | --- | --- | --- |
| RF-01 | El atleta registra una cuenta local e inicia sesión. Se acepta si correo se normaliza, contraseña se hashea argon2id y credenciales inválidas responden sin revelar cuál falló. | Alta | Implementado fase 1 |
| RF-02 | El atleta usa Google. Se acepta si API verifica ID token, audiencia y correo verificado, y no duplica la cuenta por correo. | Alta | Implementado fase 1, requiere configuración |
| RF-03 | El atleta autenticado consulta y actualiza su perfil. Se acepta si otro usuario no lee ese perfil y valores inválidos producen error de validación. | Alta | Implementado fase 1 |
| RF-04 | Visitante consulta APK Android publicada. Se acepta si sólo se ofrece la de mayor `versionCode` publicada, con checksum, y borradores no se descargan. | Media | Implementado fase 1 |
| RNF-01 | Web guarda tokens en cookies httpOnly SameSite=Lax y móvil en SecureStore. Se acepta por inspección de `apps/web/src` y `apps/mobile/src/lib/auth.tsx`. | Alta | Implementado fase 1 |
| RNF-02 | Refresh token es opaco, hashado y rotativo. Se acepta si al reutilizar uno revocado falla y se revocan sesiones. | Alta | Implementado fase 1 |
| RNF-03 | Clientes comparten contratos. Se acepta si `types`, `validation` y `api-client` compilan y sus pruebas pasan. | Media | Implementado fase 1 |
| RNF-04 | Documentación es regenerable. Se acepta si el generador actualiza OpenAPI/ERD y `--check` no detecta diferencias. | Media | Implementado fase 1 |
| RNF-05 | Claves IA no llegan al cliente. Se acepta si sólo API lee `GEMINI_API_KEY` y proveedor no implementado rechaza solicitudes. | Alta | Implementado fase 1 |

## 5.2 Requerimientos planeados

RF-05 contempla catálogo de movimientos, entrenamientos y resultados; RF-06, marcas personales, historial, estadísticas y evolución; RF-07, asistente de IA. No se les asigna estado implementado ni pruebas porque no existen entidades, endpoints ni evidencia que los sustenten.

## 5.3 Fuera de alcance

Membresías, pagos, facturación, reservas, clases, coaches, POS, inventario, biometría, torniquetes, rankings públicos, multi-gym y SaaS están explícitamente fuera de alcance. No deben convertirse en criterios de aceptación de esta fase.

## 5.4 Detalle de aceptación funcional

RF-01 incluye al atleta como actor y a la API como autoridad de identidad. La aceptación no depende de que una pantalla “parezca” registrar: se observa que el registro responde con usuario público y tokens, que el correo se guarda en minúsculas y que el hash persistido no contiene contraseña plana. El inicio requiere credenciales correctas y para los fallos devuelve el mismo código de credenciales inválidas, disminuyendo la enumeración de cuentas. La prioridad es alta porque perfil y recursos protegidos requieren sesión.

RF-02 tiene como actor al atleta con una identidad de Google y como precondición la configuración de client ID. La aceptación exige que un token inválido o un correo no verificado no cree usuario. Para una identidad válida, el claim sub es la clave del proveedor; si existe una cuenta local no verificada con el mismo correo, se vincula sin duplicar usuario y se revocan sesiones locales. El estado sigue siendo implementado con configuración pendiente: que el código soporte el flujo no significa que una cuenta Google institucional esté configurada.

RF-03 tiene como actor al atleta autenticado. La aceptación requiere Bearer válido, creación o actualización sobre la identidad de la sesión y rechazo de experiencia u objetivo fuera de enumeraciones. Consultar desde otra sesión no puede recuperar el perfil ajeno. El perfil puede estar ausente antes de la primera actualización; esa condición se expresa como PROFILE_NOT_FOUND en lugar de inventar valores por defecto.

RF-04 tiene como actor al visitante o cliente móvil. La aceptación requiere que latest/android seleccione el mayor versionCode entre publicaciones, que no revele borradores y que download incluya contenido APK y checksum. Una versión con formato inválido, archivo ausente o ruta maliciosa debe terminar como recurso no encontrado o validación, no como lectura de un archivo fuera del almacenamiento. La publicación no es RF público: corresponde al operador y es una tarea de infraestructura controlada.

## 5.5 Detalle no funcional

RNF-01 describe almacenamiento de credenciales, no una promesa absoluta de seguridad. En web, cookies httpOnly reducen acceso de JavaScript al token y SameSite=Lax reduce ciertos envíos cruzados. En móvil, SecureStore delega el almacenamiento seguro a capacidades del sistema operativo. La aceptación se verifica por las rutas de implementación; no existe una prueba e2e móvil registrada que permita declarar más que esa revisión de código.

RNF-02 protege continuidad de sesión. El servidor guarda el hash de refresh, rota la credencial al usarla y marca revocación. La prueba de reutilización demuestra la regla de servicio; no demuestra detección de robo de dispositivo ni una política de notificación. RNF-03 requiere contratos consistentes y pruebas de esquema/cliente, pero API mantiene su frontera. RNF-04 exige generación y revisión de artefactos para detectar divergencias. RNF-05 exige que Gemini permanezca en servidor y que no se represente una IA futura como funcionalidad actual.
