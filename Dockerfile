# SANAD - Smart AI Nurse Assistant for Disaster
# Multi-stage Docker build

# =============================================================================
# Stage 1: Build the application
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=http://localhost:8090
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# =============================================================================
# Stage 2: Production image with Nginx
# =============================================================================
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/mime.types /etc/nginx/mime.types

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for security
RUN adduser -D -g '' appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
