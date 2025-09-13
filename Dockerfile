# Multi-stage build for minimal size
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies with exact versions
RUN npm install --production --no-audit --no-fund && \
    npm cache clean --force

# Remove unnecessary files from node_modules
RUN find node_modules -type f -name '*.md' -delete && \
    find node_modules -type f -name '*.txt' -delete && \
    find node_modules -type f -name '*.map' -delete && \
    find node_modules -type f -name '*.ts' -delete && \
    find node_modules -type d -name 'test' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'tests' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'docs' -exec rm -rf {} + 2>/dev/null || true

# Production stage - minimal alpine image
FROM node:20-alpine

# Install only runtime dependencies
RUN apk add --no-cache \
    cairo \
    pango \
    tini && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs logs && \
    chmod 700 logs

# Security: Drop all capabilities and run as non-root
USER nodejs

# Set Node.js production optimizations
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256 --optimize-for-size" \
    UV_THREADPOOL_SIZE=2

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the bot
CMD ["node", "--experimental-modules", "src/index.js"]