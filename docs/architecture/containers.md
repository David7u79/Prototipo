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
    R[releases]
    I[frontera AiProvider]
  end
  P[(PostgreSQL :5442)]
  S[storage/releases]
  L --> R
  W --> A
  M --> A
  A --> P
  R --> P
  R --> S
```

Los paquetes internos `types`, `validation` y `api-client` se consumen en clientes; API
mantiene su propia validación de frontera.
