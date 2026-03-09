FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configuration
COPY package*.json turbo.json ./

# Copy packages
COPY packages/types ./packages/types

# Copy web application
COPY apps/web ./apps/web

# Install dependencies
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set strict-ssl false \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000
RUN npm install --no-audit --progress=false

# Build the Web app
WORKDIR /app/apps/web
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT 3000

# server.js is located in the corresponding path inside standalone
CMD ["node", "apps/web/server.js"]
