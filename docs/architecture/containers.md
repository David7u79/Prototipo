# Contenedores

```mermaid
flowchart TB
  subgraph Clientes
    L[Astro landing :4321]
    W[Next.js web :3000]
    M[Expo :8081]
  end
  subgraph API[API NestJS :4000]
    A[auth y profile]
    MR[movements y records]
    R[releases]
    I[frontera AiProvider / ProgressSnapshotService]
  end
  subgraph PaquetesCompartidos[Paquetes compartidos del monorepo]
    DOM["@garfit/domain<br/>(reglas puras, unidades y progreso)"]
    MOV["@garfit/movements<br/>(taxonomía, catálogo 1319 ej.)"]
    VAL["@garfit/validation<br/>(esquemas Zod)"]
    TYP["@garfit/types<br/>(contratos API)"]
    CLI["@garfit/api-client<br/>(cliente HTTP tipado)"]
  end
  P[(PostgreSQL :5442)]
  S[storage/releases]

  L --> R
  W --> A
  W --> MR
  M --> A
  M --> MR
  A --> P
  MR --> P
  R --> P
  R --> S

  DOM -.-> API
  DOM -.-> W
  DOM -.-> M
  MOV -.-> API
  VAL -.-> W
  VAL -.-> M
  CLI -.-> W
  CLI -.-> M
  CLI -.-> L
```

Los paquetes internos `@garfit/domain`, `@garfit/movements`, `@garfit/types`, `@garfit/validation` y `@garfit/api-client` estructuran la lógica de negocio y comunicación sin duplicar definiciones:
- `@garfit/domain` concentra reglas de negocio universales (límites, enums, conversiones exactas de unidades y cálculo determinista de marcas y progreso), siendo consumido por la API y los clientes web y móvil.
- `@garfit/movements` provee la taxonomía del catálogo, reglas de derivación de marcas y el catálogo curado reproducible con 1319 movimientos para la siembra de la base de datos.
- `@garfit/types`, `@garfit/validation` y `@garfit/api-client` permiten compartir contratos y validación ergonómica en clientes, mientras la API mantiene su propia validación estricta de frontera mediante DTOs y class-validator.

El diagrama muestra responsabilidades, paquetes y puertos locales de desarrollo, no una topología de despliegue en producción. La decisión de concentrar el acceso a los datos en la API NestJS preserva el aislamiento y la autorización por usuario; la base de datos PostgreSQL y el almacenamiento de binarios no son accesibles directamente desde los clientes.

