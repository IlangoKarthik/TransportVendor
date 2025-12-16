# Multi-stage Dockerfile for Netkathir AI Tool
# Production-ready single server deployment

# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Build React app
RUN npm run build

# Stage 2: Final Production Image
FROM node:18-bullseye-slim

WORKDIR /app

# Install Python3 and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY document_search/requirements.txt ./document_search_requirements.txt
COPY db_search/requirements.txt ./db_search_requirements.txt

# Install Python dependencies
RUN pip3 install --no-cache-dir -r document_search_requirements.txt && \
    pip3 install --no-cache-dir -r db_search_requirements.txt

# Copy server package files
COPY server/package*.json ./server/

# Install Node.js dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Copy server source
WORKDIR /app
COPY server/ ./server/

# Copy Python AI services
COPY document_search/ ./document_search/
COPY db_search/ ./db_search/

# Copy built React app from frontend-builder
COPY --from=frontend-builder /app/client/build ./client/build

# Create data directory
RUN mkdir -p /app/data/uploads /app/data/embeddings

# Set environment
ENV NODE_ENV=production
ENV PORT=80

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:80/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
