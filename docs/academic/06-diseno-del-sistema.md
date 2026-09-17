# 6. Diseño del sistema

## 6.1 Arquitectura por capas

GarFit separa presentación, aplicación, persistencia e infraestructura. La presentación contiene landing Astro, web Next.js y móvil Expo. La aplicación está en NestJS y concentra salud, autenticación, perfil, releases e IA. Prisma traduce operaciones a PostgreSQL; ReleaseStorage representa almacenamiento de binarios. La separación evita acceso directo de clientes a datos y mantiene reglas comunes.

El diagrama de contenedores en [architecture/containers](../architecture/containers.md) muestra que landing, web y móvil llegan a la API, mientras sólo ésta conoce PostgreSQL y ReleaseStorage. La API es el límite de confianza: la landing sólo consulta releases y no administra publicación. El diagrama no representa funciones futuras.

## 6.2 Responsabilidades y contratos

apps/api implementa endpoints, autenticación JWT, Prisma y CLI. apps/web usa proxy.ts para proteger rutas y server actions para intercambiar tokens mediante cookies httpOnly. apps/mobile usa Stack.Protected, SecureStore y renovación de sesión. apps/landing es sitio público y consulta la versión Android. packages/types expone formas, packages/validation esquemas Zod, packages/api-client cliente fetch y packages/config reglas compartidas.

Los paquetes reducen discrepancias, pero API conserva DTO y validación de frontera. Las contraseñas usan argon2id; el JWT de acceso se firma HS256 y el refresh se guarda sólo como hash. Google se verifica en servidor. La web no expone tokens a JavaScript por cookies httpOnly y móvil no los guarda en almacenamiento ordinario.

## 6.3 Decisiones y riesgos

La publicación de APK no tiene endpoint administrativo: el CLI y la validación de claves reducen riesgos de rutas maliciosas. Cookies requieren HTTPS en producción, SecureStore depende del dispositivo y almacenamiento local no es una solución distribuida. Los riesgos y alternativas se documentan en ADR; no se afirman resueltos fuera del entorno de desarrollo.

## 6.4 Flujos y límites de confianza

En autenticación local, el cliente entrega correo y contraseña a la API mediante HTTPS en el despliegue que corresponda. El controlador valida la forma de entrada, el servicio normaliza el correo, consulta Prisma y usa argon2id antes de crear una cuenta LOCAL. La respuesta contiene representación pública de usuario y tokens, nunca passwordHash. El acceso posterior llega con Bearer JWT para API o mediante server actions en web; el guard verifica firma y expiración antes de permitir perfil.

La renovación es deliberadamente distinta al acceso: el refresh token es opaco y no se usa como credencial JWT. Sólo se conserva su SHA-256 en Session. Al renovarlo, el servicio revoca la sesión anterior y crea otra; si detecta reutilización, invalida sesiones del usuario. Este flujo limita el impacto de una copia de refresh token, aunque no sustituye revocación global, monitoreo ni protección del equipo cliente.

La comunicación de releases separa escritura y lectura. El CLI recibe archivo y metadatos, calcula tamaño e integridad mediante el servicio y coloca el contenido usando ReleaseStorage. La API pública consulta sólo AppRelease publicado y emite la descarga con checksum. La landing no conoce la ruta interna filePath. Esta separación permite cambiar el proveedor de bytes sin cambiar el contrato público, pero requiere que un futuro proveedor preserve validación de claves y control de acceso.

La frontera de IA no integra solicitudes de clientes durante esta fase. AiProvider evita que una futura decisión de proveedor atraviese controladores de negocio. El proveedor Gemini lee configuración exclusiva de servidor y actualmente informa no implementación. Cuando se habilite deberá recibir únicamente contexto permitido, usar cálculo determinista para valores numéricos y registrar decisiones de privacidad.
