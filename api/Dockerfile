FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configuration
COPY package*.json turbo.json ./

# Copy packages
COPY packages/types ./packages/types

# Copy api application
COPY apps/api ./apps/api

# Install dependencies
RUN npm config set fetch-retry-maxtimeout 1200000 \
    && npm config set fetch-retries 10 \
    && npm config set fetch-retry-mintimeout 30000 \
    && npm config set loglevel error
RUN npm ci
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build the API
WORKDIR /app/apps/api
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
