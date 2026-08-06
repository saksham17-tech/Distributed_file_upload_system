FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/upload-service ./apps/upload-service
RUN npm ci
RUN npm run build --workspace=apps/upload-service

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages ./packages
COPY --from=builder /app/apps/upload-service/dist ./apps/upload-service/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/upload-service/node_modules ./apps/upload-service/node_modules

EXPOSE 50051
CMD ["node", "apps/upload-service/dist/main.js"]
