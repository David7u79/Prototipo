#!/bin/sh
set -eu

# Las migraciones se aplican de forma visible antes de aceptar tráfico. Prisma sólo
# ejecuta migraciones ya versionadas; no genera ni modifica el esquema en producción.
./node_modules/.bin/prisma migrate deploy

exec node dist/main.js
