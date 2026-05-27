FROM node:24-slim

# Install dependencies needed for bun install script
RUN apt-get update && apt-get install -y curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Bun 1.3
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.0"

ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

WORKDIR /app

# Copy dependency manifests first (better caching)
COPY package.json bun.lockb* ./

# Install deps
RUN bun install

# Copy the rest of the app
COPY . .

# Build step (uses your package.json "build" script)
RUN bun run build

# Start step (uses your package.json "start" script)
CMD ["bun", "run", "start"]