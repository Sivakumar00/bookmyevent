# Dockerfile - Production

# Stage 1: Base
FROM node:18-alpine AS base
# RUN apk update
# RUN apk add --no-cache libc6-compat

WORKDIR /app

# Stage 2: Builder
FROM base AS builder

# Copy all source files
COPY . .

# Install pnpm and turbo globally
RUN npm install -g pnpm turbo typescript && \
    pnpm config set shamefully-hoist true

# Install deps (ignore postinstall errors)
RUN pnpm install --frozen-lockfile || true

# Build
RUN pnpm --filter=api run build 

# Stage 3: Runtime
FROM base AS runner

WORKDIR /app

# Security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

# Copy artifacts
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/openapi.json ./

# Environment variables - use GCP env vars with defaults
ENV DB_HOST=${DB_HOST:-postgres}
ENV DB_PORT=${DB_PORT:-5432}
ENV DB_USERNAME=${DB_USERNAME:-postgres}
ENV DB_PASSWORD=${DB_PASSWORD:-postgres}
ENV DB_DATABASE=${DB_DATABASE:-bookmyevent}
ENV PORT=${PORT:-3000}

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]