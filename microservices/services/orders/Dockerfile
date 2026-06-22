# Build context = microservices/ root. Compiled: esbuild bundles src + @qlisted/shared
# into a single CJS file (Fastify/avvio need CJS, not ESM) — runtime is plain node,
# no tsx and no node_modules in the final image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY services/orders ./services/orders
RUN npm install --workspaces --include-workspace-root=false || npm install
RUN npx --yes esbuild services/orders/src/server.ts --bundle --platform=node --format=cjs --outfile=/app/server.cjs

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/server.cjs ./server.cjs
EXPOSE 8080
CMD ["node","server.cjs"]
