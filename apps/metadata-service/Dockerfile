FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/metadata-service ./apps/metadata-service
RUN npm ci
RUN npm run db:generate --workspace=@upload-system/database
RUN npm run build --workspace=apps/metadata-service

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages ./packages
COPY --from=builder /app/apps/metadata-service/dist ./apps/metadata-service/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/metadata-service/node_modules ./apps/metadata-service/node_modules

EXPOSE 50052
CMD ["node", "apps/metadata-service/dist/main.js"]
