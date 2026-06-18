# syntax=docker/dockerfile:1
# Multi-stage, cloud-native build producing a minimal standalone server.
# Small enough to schedule at the edge (KubeEdge) or in any CNCF cluster.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Default the durable file store to a writable, owned directory (mount a volume
# here for persistence, or set SURREAL_URL to use SurrealDB instead).
ENV DATA_DIR=/data
# Run as non-root for a tighter, SPIFFE/CNCF-aligned security posture.
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data && chown app:app /data
VOLUME /data
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/healthz || exit 1
CMD ["node", "server.js"]
