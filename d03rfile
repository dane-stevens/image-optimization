# --- Builder stage ---
FROM node:24-slim AS builder

RUN apt-get update && apt-get install -y curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Bun 1.3
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14"

ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

WORKDIR /app

# Install deps first (better caching)
COPY package.json bun.lockb* ./
RUN bun install

# Copy source
COPY . .

# Build
RUN bun run build


# --- Runtime stage ---
FROM node:24-slim

RUN apt-get update && apt-get install -y curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Bun 1.3 in runtime too
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14"

ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

WORKDIR /app

# Copy only built output + required manifests
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# If you need runtime deps (sharp, zod, etc.)
RUN bun install --production

EXPOSE 3000

CMD ["bun", "run", "start"]