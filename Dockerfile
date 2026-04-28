FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Force development so pnpm installs devDependencies (tsup, typescript…)
# regardless of the NODE_ENV build arg passed by Coolify.
RUN corepack enable && NODE_ENV=development pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app

# node:22-alpine ships with a `node` user (uid=1000). Create the SQLite
# data directory owned by that user before switching to it.
RUN mkdir -p /app/data && chown node:node /app/data

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/pnpm-lock.yaml ./
COPY --from=builder --chown=node:node /app/src/db/migrations ./src/db/migrations

RUN corepack enable && pnpm install --prod --frozen-lockfile

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

EXPOSE 3001

CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/index.js"]
