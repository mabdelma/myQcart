FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npx tsc
EXPOSE 3001
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
