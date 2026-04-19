# Dockerfile - Production

# Stage 1: Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# Stage 2: Builder
FROM base AS builder

WORKDIR /app

# Copy package files
COPY pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/

# Install dependencies with ignore-scripts
RUN pnpm config set ignore-scripts true && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build API
RUN pnpm dlx turbo run build

# Stage 3: Production runner
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy ALL node_modules - root + api package
# This ensures pnpm symlinks resolve correctly
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages ./packages

COPY --from=builder /app/openapi.json ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_USERNAME=postgres
ENV DB_PASSWORD=postgres
ENV DB_DATABASE=bookmyevent
ENV PORT=3000

RUN mkdir -p /app/apps/api/data && chown -R nodejs:nodejs /app/apps/api/data

USER nodejs

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]