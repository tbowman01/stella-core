# Multi-stage Dockerfile for ArcQubit Platform

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/auth/package.json ./packages/auth/
COPY packages/documents/package.json ./packages/documents/
COPY packages/compliance/package.json ./packages/compliance/
COPY packages/pqc/package.json ./packages/pqc/
COPY packages/workspaces/package.json ./packages/workspaces/
COPY packages/search/package.json ./packages/search/
COPY packages/ai/package.json ./packages/ai/
COPY packages/plugins/package.json ./packages/plugins/
COPY packages/cache/package.json ./packages/cache/
COPY packages/jobs/package.json ./packages/jobs/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/ ./packages/
COPY apps/ ./apps/

# Build all packages
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy built files from builder
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/node_modules ./node_modules

# Copy configuration files
COPY turbo.json ./
COPY tsconfig.json ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
