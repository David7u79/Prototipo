# Diseño del sistema

GarFit separa landing estática, aplicación web, aplicación móvil y API central. Los
paquetes `types`, `validation` y `api-client` mantienen contratos de cliente; la API
replica las constantes de validación en su frontera de confianza y no importa esos
paquetes en tiempo de ejecución.

La web protege `/app/**` mediante proxy y cookies httpOnly. El móvil conserva tokens en
SecureStore y renueva sesión al iniciar y ante 401. La API usa PostgreSQL, Prisma y módulos
de salud, autenticación, perfil, releases e IA. Los diagramas verificables están en
[arquitectura](../architecture/system-context.md).
