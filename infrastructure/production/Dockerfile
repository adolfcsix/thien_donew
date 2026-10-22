# Resolve these tags to tested digests in the release pipeline before production.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY . .
# Next's API rewrites are compiled at build time. Inside Compose,
# localhost is the web container, not the NestJS API service.
ENV NEXT_TELEMETRY_DISABLED=1 API_INTERNAL_URL=http://api:8080
RUN npm ci --no-audit --no-fund && npm run typecheck && npm run build
RUN npm prune --omit=dev --no-audit --no-fund && npm run check:production:smoke

FROM ${NODE_IMAGE} AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/infrastructure ./infrastructure
# A new named volume copies these directories and their non-root ownership.
RUN mkdir -p /var/lib/thiendo/private/books /var/lib/thiendo/private/van-kho-media \
 && chown -R node:node /var/lib/thiendo/private \
 && chmod 700 /var/lib/thiendo/private /var/lib/thiendo/private/books /var/lib/thiendo/private/van-kho-media
USER node
EXPOSE 8080
ENTRYPOINT ["node", "infrastructure/production/container-entrypoint.mjs"]
CMD ["node", "apps/api/dist/main.js"]

FROM ${NODE_IMAGE} AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
# Standalone omits the browser bundles/styles by design. Without this copy,
# production serves HTML but /_next/static/* returns 404 (unstyled/broken UI).
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
