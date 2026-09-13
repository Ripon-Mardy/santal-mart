# syntax=docker/dockerfile:1

# ---- deps -------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# A dummy DATABASE_URL is enough for `next build` — no queries run at build time.
ENV DATABASE_URL="postgresql://bazarx:bazarx@postgres:5432/bazarx?schema=public"
RUN npx prisma generate
RUN npm run build

# ---- runner -------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Next's standalone trace can miss the Prisma query-engine/wasm files that
# aren't statically imported — copy the generated client explicitly so the
# runtime image always has them regardless of tracing behavior.
COPY --from=builder /app/src/generated ./src/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
