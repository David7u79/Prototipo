# Contexto del sistema

```mermaid
flowchart LR
  Atleta --> Landing[Landing Astro]
  Atleta --> Web[Web Next.js]
  Atleta --> Mobile[Móvil Expo]
  Landing --> API[NestJS API]
  Web --> API
  Mobile --> API
  API --> DB[(PostgreSQL)]
  API --> Storage[ReleaseStorage local]
  Google[Google OIDC] --> API
```

La landing informa y consulta APK; web y móvil consumen la API. Google sólo entrega el ID
token al cliente: la validación sucede en API. La IA está delimitada, pero no expone ruta.
