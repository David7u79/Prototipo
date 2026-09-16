# Modelo de datos

El esquema Prisma de fase 1 modela `User`, `AuthAccount`, `Session`, `AthleteProfile` y
`AppRelease`. Un usuario puede tener cuentas y sesiones; tiene a lo sumo un perfil. Una
sesión sólo conserva el hash del refresh token. Una publicación Android conserva metadatos
y una clave relativa de almacenamiento, no el binario en la base de datos.

El diagrama es generado desde el esquema fuente: [ERD](../generated/database/erd.svg).
No se duplica aquí para evitar que documentación y esquema diverjan.
