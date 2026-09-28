# ==============================================================================
# Multi-Stage Dockerfile for Cloud-Native Employee Management System
# ==============================================================================

# Stage 1: Dependency resolution and build
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only (omit devDependencies for lean footprint)
RUN npm ci --only=production --ignore-scripts

# ------------------------------------------------------------------------------
# Stage 2: Final lightweight runtime container
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Install curl / wget for container healthcheck
RUN apk add --no-cache wget curl tzdata

# Set working directory
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Copy cached dependencies from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code and static web assets
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Create data directory with permissions for node user
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app

# Run as non-privileged security user
USER node

# Expose web application port
EXPOSE 3000

# Container Healthcheck (polled every 30s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start Node.js application server
CMD ["node", "src/server.js"]
