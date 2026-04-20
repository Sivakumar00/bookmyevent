# Stage 1: Base
FROM node:18-alpine AS base

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Stage 2: Dependencies
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Stage 3: Build
FROM base AS builder

WORKDIR /app

# Copy package files and node_modules from deps
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Build the application
RUN npm run build

# Stage 4: Production runtime
FROM base AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/openapi.json ./

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]