# STAGE 1: Use the latest Node LTS as the base
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# STAGE 2: Install dependencies (including adapter-node)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# STAGE 3: Build the application
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ---> THIS IS THE KEY INSTRUCTION <---
# Before building, use 'sed' to replace 'adapter-auto' with 'adapter-node'
# in the svelte.config.js file. This change only exists inside this container.
RUN sed -i "s/@sveltejs\/adapter-auto/@sveltejs\/adapter-node/g" svelte.config.js

# Now, 'pnpm build' will use adapter-node because we just changed the config file
RUN pnpm build

# STAGE 4: Create the small, final production image
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy only the built output and necessary dependencies from the build stage
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Expose the production port
EXPOSE 3000

# Run the optimized Node.js server
CMD [ "node", "build" ]