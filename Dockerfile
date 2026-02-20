
# ---- Build Stage ----
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# ---- Production Stage ----
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app

# Use non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8022
CMD [ "node", "server.js" ]
