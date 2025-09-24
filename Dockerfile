# BASE IMAGE
FROM node:22-alpine AS base
LABEL author="PancakesLmao <phucthin29@gmail.com>"
LABEL description="Dockerfile for Nextjs weather platform"
LABEL version="1.0"

# Set the working directory
WORKDIR /app

# Install git n pnpm globally
RUN apk add --no-cache git
RUN npm install -g pnpm

# INSTALL dependencies
FROM base AS deps
# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./
# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# BUILD the application
FROM deps AS build
# Copy the source code
COPY . .
# Build the application
RUN pnpm run build   

# PRODUCTION IMAGE
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
# Install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache git && npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy built app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/src/middleware.ts ./middleware.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["pnpm", "start"]