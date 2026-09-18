# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /workspace
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/movements/package.json packages/movements/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm --filter @garfit/web build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build --chown=nextjs:nextjs /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nextjs /workspace/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
