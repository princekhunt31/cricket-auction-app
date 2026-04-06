# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:lts-slim AS builder

WORKDIR /app

# Install dependencies first (layer-cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build for production
COPY . .
RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────
FROM nginx:alpine AS server

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Inject custom config (SPA routing + caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy only the client-side browser files from Stage 1
COPY --from=builder /app/dist/cricket-auction-app/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
