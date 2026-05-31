FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY . .

# Build CSS
RUN bun run css:build

EXPOSE 3114

CMD ["bun", "run", "src/index.ts"]
