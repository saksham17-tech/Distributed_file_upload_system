FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/worker-service ./apps/worker-service
RUN npm ci
RUN npm run build --workspace=apps/worker-service

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages ./packages
COPY --from=builder /app/apps/worker-service/dist ./apps/worker-service/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker-service/node_modules ./apps/worker-service/node_modules

CMD ["node", "apps/worker-service/dist/main.js"]
