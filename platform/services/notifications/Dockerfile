# Multi-stage build for the notifications microservice.
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Workspace deps (shared package + service)
COPY package.json ./
COPY ../../packages/shared /packages/shared
RUN npm install --omit=dev --no-package-lock

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json || true

EXPOSE 8080
CMD ["node", "dist/server.js"]
