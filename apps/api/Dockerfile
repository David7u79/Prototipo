# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /workspace
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/movements/package.json packages/movements/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
# prisma.config.ts exige DATABASE_URL, pero `prisma generate` no conecta: basta un valor
# ficticio limitado a este RUN. La URL real sólo existe en runtime.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
  pnpm --filter @garfit/api prisma:generate \
  && pnpm --filter @garfit/api... build

FROM node:24-alpine AS runtime
# ponytail: se copia el workspace entero porque los paquetes exportan `src/*.ts` y Node no
# elimina tipos dentro de node_modules, así que `pnpm deploy` no sirve. Si el tamaño de la
# imagen llega a importar, hay que compilar los paquetes a JS y entonces volver a `pnpm deploy`.
WORKDIR /workspace/apps/api
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
RUN addgroup -S garfit && adduser -S garfit -G garfit \
  && mkdir -p /data/releases \
  && chown -R garfit:garfit /data \
  && chmod 0555 docker-entrypoint.sh
USER garfit
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
