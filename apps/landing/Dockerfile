# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /workspace
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/movements/package.json packages/movements/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
ARG PUBLIC_API_URL
ARG PUBLIC_WEB_APP_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_WEB_APP_URL=$PUBLIC_WEB_APP_URL
COPY . .
RUN pnpm --filter @garfit/landing build

FROM nginx:1.27-alpine AS runtime
COPY apps/landing/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/apps/landing/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
