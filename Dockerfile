# STAGE 1: Use the latest Node LTS as the base
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# STAGE 2: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# STAGE 3: Build the application for Docker
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time API base override
# Build-time API base override (defaults to current origin)
ARG API_BASE_URL=""
ENV VITE_API_BASE_URL=$API_BASE_URL

# ---> Set the variable to choose the Node.js adapter <---
ENV DEPLOY_TARGET=docker

# This command now uses adapter-node because of the variable
RUN pnpm build

# STAGE 4: Create the final production image
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# This will now work because adapter-node creates the '/app/build' directory
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 6666
CMD [ "node", "build" ]
