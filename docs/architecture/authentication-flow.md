# Flujos de autenticación

## Cuenta local y refresh rotativo

```mermaid
sequenceDiagram
  participant C as Cliente
  participant A as API
  participant D as PostgreSQL
  C->>A: POST /auth/register o /login
  A->>D: usuario/cuenta; argon2id
  A-->>C: JWT acceso + refresh opaco
  C->>A: POST /auth/refresh(refresh)
  A->>D: busca hash SHA-256
  alt válido y no revocado
    A->>D: revoca sesión y guarda refresh nuevo
    A-->>C: JWT + refresh nuevo
  else refresh revocado reutilizado
    A->>D: revoca todas las sesiones del usuario
    A-->>C: error de autenticación
  end
```

Web guarda tokens en cookies httpOnly SameSite=Lax; móvil usa SecureStore. JWT HS256 dura
`JWT_ACCESS_TTL_SECONDS` (900 por defecto).

## Google OAuth/OIDC

```mermaid
sequenceDiagram
  participant C as Web o móvil
  participant G as Google
  participant A as API
  participant D as PostgreSQL
  C->>G: solicita ID token
  G-->>C: ID token
  C->>A: POST /auth/google
  A->>G: verifica firma/audience
  A->>A: exige email_verified
  A->>D: busca sub; después correo
  alt cuenta LOCAL sin correo verificado
    A->>D: elimina cuenta LOCAL y revoca sesiones; vincula Google
  else usuario existente o nuevo
    A->>D: vincula o crea sin duplicar correo
  end
  A-->>C: JWT + refresh opaco
```

No se usa client secret. Si falta `GOOGLE_WEB_CLIENT_ID`, API responde
`GOOGLE_AUTH_NOT_CONFIGURED`.
