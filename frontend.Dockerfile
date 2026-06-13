FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/

# Vite inlines VITE_* vars into the JS bundle AT BUILD TIME. The Stripe
# publishable key must therefore be passed as a build arg here, or checkout
# silently runs with an empty key in production. VITE_API_URL is left empty so
# the client uses the relative "/api" path (same-origin behind Caddy).
ARG VITE_STRIPE_KEY=""
ARG VITE_API_URL=""
ENV VITE_STRIPE_KEY=$VITE_STRIPE_KEY
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # API + Server-Sent Events. Buffering MUST be off or the SSE stream
    # (/api/r/:slug/events) is held back by nginx and live order updates stall.
    location /api/ {
        proxy_pass http://api:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }

    # User-uploaded images (menu items, logos) are stored on and served by the
    # API container at /uploads/*.
    location /uploads/ {
        proxy_pass http://api:3001/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Hashed build assets are immutable — cache them hard.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
