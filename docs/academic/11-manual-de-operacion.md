# Manual de operación

## Instalación y ejecución local

1. Instale Node >=22.12 (desarrollo: 24) y pnpm 11.20.
2. Copie y complete los `.env.example` disponibles, sin versionar secretos.
3. Ejecute `pnpm install`, `pnpm db:up`, `pnpm db:migrate` y `pnpm dev`.
4. Abra API `:4000`, web `:3000`, landing `:4321` o Expo `:8081`. PostgreSQL escucha en
   `:5442` y crea `garfit` y `garfit_test`.

## Publicar APK

Con API compilable y PostgreSQL disponible, ejecute:

```sh
pnpm --filter @garfit/api release:publish -- --file ruta/app.apk \
  --version 1.0.0 --version-code 1 --changelog "Cambios"
```

Agregue `--draft` para no publicar. No existe endpoint HTTP ni rol administrativo para
publicar. La landing consulta la última versión publicada.

## Google OAuth

Configure el cliente Web en `GOOGLE_WEB_CLIENT_ID` y en móvil; agregue las audiencias
Android necesarias a `GOOGLE_EXTRA_AUDIENCES`. Autorice `http://localhost:3000`.
