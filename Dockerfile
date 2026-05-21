# syntax=docker/dockerfile:1.7

# ---------- Stage 1: deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Copy ONLY package manifests for cache efficiency.
# Any change to source code does NOT invalidate this layer.
COPY package.json package-lock.json ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN npm ci

# ---------- Stage 2: build ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client into packages/database/src/generated/prisma/
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd packages/database && npx prisma generate

# Build apps/web (turbo runs react-router build inside the workspace)
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the resolved workspace tree
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

WORKDIR /app/apps/web
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]