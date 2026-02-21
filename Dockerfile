
FROM node:20-bullseye AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-bullseye
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app

# Use non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8022
CMD [ "node", "server.js" ]
