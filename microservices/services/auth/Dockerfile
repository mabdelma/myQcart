# Build context = microservices/ root (npm workspaces link @qlisted/shared).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY services/auth ./services/auth
RUN npm install --workspaces --include-workspace-root=false || npm install
WORKDIR /app/services/auth
EXPOSE 8080
CMD ["npx","tsx","src/server.ts"]
