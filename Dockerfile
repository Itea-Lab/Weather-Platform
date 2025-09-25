FROM node:22-alpine AS base
LABEL author="PancakesLmao <phucthin29@gmail.com>"
LABEL description="Dockerfile for Nextjs weather platform"
LABEL version="1.1"

# Use corepack to activate pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Set the working directory
WORKDIR /app

# INSTALL dependencies
FROM base AS deps
# Copy package files
COPY package.json pnpm-lock.yaml ./
# Cache pnpm store and prefetch dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm fetch && pnpm install --frozen-lockfile

# BUILD the application
FROM deps AS build
COPY next.config.ts tsconfig.json postcss.config.mjs ./
COPY src ./src
COPY public ./public
COPY amplify_outputs.json ./amplify_outputs.json
# Cache Next.js build
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm run build

# PRODUCTION IMAGE
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Activate pnpm via corepack for prod
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./
# Cache pnpm store for prod install
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm fetch && pnpm install --prod --frozen-lockfile

# Copy only necessary files from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/amplify_outputs.json ./amplify_outputs.json

EXPOSE 3000
CMD ["pnpm", "start"]