# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with retry and timeout settings
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci || npm ci || npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Install all dependencies with retry and timeout settings
COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --omit=dev || npm ci --omit=dev || npm ci --omit=dev

# Copy Prisma files for migrations
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma client (needed for migrations)
RUN npx prisma generate

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy production Prisma config for migrations
COPY prisma.config.prod.js ./prisma.config.js

# Copy necessary config files
COPY tsconfig.json ./

# Create config directory for Firebase admin SDK (will use env vars)
RUN mkdir -p src/config

# Note: Firebase config is provided via environment variables in docker-compose.yml
# If you need to use firebase-admin.json file instead, uncomment the line below:
# COPY src/config/firebase-admin.json ./src/config/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["node", "dist/server.js"]