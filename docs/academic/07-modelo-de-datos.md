# 7. Modelo de datos

## 7.1 Fuente, relaciones y cardinalidades

El esquema fuente es apps/api/prisma/schema.prisma. El [ERD generado](../generated/database/erd.svg) se deriva de él para impedir divergencia documental. User tiene cero o muchas AuthAccount y Session, y cero o un AthleteProfile. AppRelease es independiente porque la publicación es una operación técnica.

## 7.2 User

| Atributo | Tipo | Restricción | Propósito |
| --- | --- | --- | --- |
| id | String | PK, uuid(7) | Identificador |
| email | String | único | Correo normalizado |
| name, avatarUrl | String? | nullable | Datos visibles |
| emailVerifiedAt | DateTime? | nullable | Verificación externa |
| createdAt, updatedAt | DateTime | default y actualizado | Auditoría |

La unicidad de correo impide más de un usuario por dirección. Sus relaciones usan borrado en cascada.

## 7.3 Identidad, sesión y perfil

| Entidad | Atributos | Restricciones y propósito |
| --- | --- | --- |
| AuthAccount | id, userId, provider, providerAccountId, passwordHash, createdAt | único por proveedor/cuenta y usuario/proveedor; LOCAL guarda hash y GOOGLE sub |
| Session | id, userId, refreshTokenHash, userAgent, expiresAt, revokedAt, createdAt | hash único; índice userId |
| AthleteProfile | id, userId, displayName, experienceLevel, primaryGoal, createdAt, updatedAt | userId único; User 1 a 0..1 Profile |

Las enumeraciones AuthProvider, ExperienceLevel y PrimaryGoal restringen valores. AuthAccount y Session son relaciones User 1 a 0..N.

## 7.4 Releases, unicidad e índices

| Atributo | Tipo | Restricción | Propósito |
| --- | --- | --- | --- |
| id | String | PK uuid(7) | Identificador |
| platform | ReleasePlatform | ANDROID fase 1 | Plataforma |
| version, versionCode | String, Int | únicos con plataforma | Versión y orden |
| fileName, filePath | String | clave relativa | Archivo |
| fileSize, sha256 | Int, String | requeridos | Integridad |
| changelog | String[] | requerido | Cambios |
| published, publishedAt | Boolean, DateTime? | default false | Visibilidad |

Los únicos por plataforma/versión y plataforma/código evitan ambigüedad. El índice compuesto de plataforma, publicación y código justifica buscar la última versión sin explorar borradores. No hay entidades de entrenamientos: agregarlas exige migración y requisitos futuros.

## 7.5 Reglas de integridad y evolución

El modelo separa User de AuthAccount porque una identidad puede tener más de un proveedor. La cuenta LOCAL identifica al usuario por correo normalizado y contiene passwordHash; la cuenta GOOGLE usa el claim sub y no necesita hash. Las restricciones compuestas impiden vincular dos cuentas del mismo tipo a la misma persona o asignar el mismo identificador externo a dos usuarios. La lógica de servicio añade reglas que una restricción por sí sola no expresa, como exigir correo Google verificado antes de vincular.

Session no almacena el refresh token original. La unicidad de refreshTokenHash evita que una misma credencial opaca se represente dos veces, y revokedAt permite expresar revocación sin borrar de inmediato evidencia de la sesión. expiresAt permite rechazar sesiones vencidas. userAgent es opcional porque proviene de clientes y no debe bloquear el flujo de identidad cuando falta.

AthleteProfile mantiene atributos deliberadamente acotados. displayName no sustituye nombre legal ni identifica una relación clínica; experienceLevel y primaryGoal se almacenan como enumeraciones para mantener una taxonomía controlada. Si fases futuras requieren medidas, resultados o periodos, deberán definir unidades, precisión, propietario, reglas de modificación e índices según consultas reales. No debe añadirse una tabla por una pantalla sin definir esas reglas.

En AppRelease, filePath se describe como clave relativa, nunca como ruta absoluta. La decisión es necesaria porque la base no debe indicar al almacenamiento que lea fuera de su raíz. fileName es el nombre de descarga, mientras sha256 y fileSize permiten al cliente verificar lo recibido. publishedAt es nullable para que un borrador no tenga una fecha que sugiera disponibilidad pública. La consulta ordenada por versionCode trata el orden de distribución de forma explícita y no intenta ordenar SemVer como texto.
