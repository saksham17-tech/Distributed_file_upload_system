FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/api-gateway ./apps/api-gateway
RUN npm ci
RUN npm run build --workspace=apps/api-gateway

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages ./packages
COPY --from=builder /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/node_modules ./apps/api-gateway/node_modules

EXPOSE 3001
CMD ["node", "apps/api-gateway/dist/main.js"]
