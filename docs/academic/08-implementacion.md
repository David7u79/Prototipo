# 8. Implementación

## 8.1 API

apps/api/src/health/health.controller.ts expone salud y consulta base. auth.controller.ts y auth.service.ts implementan registro, login, refresh, logout y me; las contraseñas usan argon2id, JWT de acceso y refresh opaco rotativo. google-identity.verifier.ts verifica Google en servidor. profile/profile.controller.ts administra perfil autenticado. releases ofrece lectura y descarga; storage/release-storage.ts define el contrato, local-release-storage.ts valida claves y cli/publish-release.ts publica por CLI. ai/gemini-ai.provider.ts delimita IA y rechaza la operación no implementada.

## 8.2 Web, móvil y landing

apps/web/src/proxy.ts protege /app; auth-actions.ts y app-actions.ts son server actions y lib/auth.ts maneja cookies httpOnly. apps/mobile/src/app/_layout.tsx usa Stack.Protected; lib/auth.tsx usa SecureStore y renovación al iniciar o ante 401. apps/landing/src/components/AndroidDownload.astro consulta la release pública. Ningún cliente contiene la clave Gemini.

## 8.3 Tecnologías declaradas

| Componente | Tecnología y versión declarada |
| --- | --- |
| API | NestJS ^12.0.1, Prisma 7.10.0, TypeScript ^6.0.2 |
| Web | Next 16.3.5, React 19.2.8, Vitest ^5.0.1 |
| Móvil | Expo ~57.0.23, React Native 0.86.3, SecureStore ~57.0.4 |
| Landing | Astro ^7.3.3, Tailwind ^4.3.3 |
| Contratos | Zod ^4.6.5, TypeScript ~6.0.3 |

Las versiones se toman de package.json. Arquitectura y decisiones se complementan en [ADR](../adr/README.md).

## 8.4 Organización de módulos

El módulo health es una comprobación de disponibilidad, no una métrica de servicio. Su controlador responde versión, fecha y estado de base después de consultar Prisma. El módulo auth reúne DTO, estrategia JWT, guardia, verificador Google y servicio de reglas. Centralizar estas piezas permite que profile no implemente una segunda forma de interpretar token. El filtro de excepciones normaliza errores para que clientes puedan distinguir validación, autenticación y recursos ausentes sin depender de texto humano.

Profile usa una relación única con User y expone operaciones sobre el sujeto autenticado, no sobre un identificador enviado por el cliente. Esta decisión reduce el riesgo de modificar el perfil de otra persona. Releases valida versiones y recupera sólo metadatos que corresponden a publicación. LocalReleaseStorage revisa segmentos de clave, rutas anidadas y enlaces simbólicos; por ello una ruta que llegue a la base por error no debe convertirse automáticamente en lectura arbitraria.

La web separa páginas de interfaz de acciones de servidor. El proxy redirige una navegación no autenticada en vez de confiar únicamente en ocultar enlaces. Las acciones traducen respuestas de API a cookies y navegación; safeNext evita redirecciones externas. En móvil, el proveedor de autenticación centraliza restauración, persistencia y renovación, para que las pantallas no administren tokens por separado. La navegación protegida depende del estado de sesión, aunque el servidor sigue siendo quien autoriza cada recurso.

La landing está concebida como presentación pública y no como consola administrativa. AndroidDownload utiliza el cliente tipado para consultar el release más reciente y puede informar que no existe uno publicado. Esta implementación permite que la página permanezca estática en su contenido principal mientras la disponibilidad de APK se consulta al servicio.
