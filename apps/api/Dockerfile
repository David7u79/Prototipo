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
RUN pnpm --filter @garfit/api prisma:generate \
  && pnpm --filter @garfit/api... build \
  && pnpm deploy --filter @garfit/api --prod /app

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/apps/api/prisma.config.ts ./prisma.config.ts
COPY --from=build /workspace/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN addgroup -S garfit && adduser -S garfit -G garfit \
  && mkdir -p /data/releases \
  && chown -R garfit:garfit /app /data \
  && chmod 0555 /app/docker-entrypoint.sh
USER garfit
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
