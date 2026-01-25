FROM denoland/deno:debian

WORKDIR /app

# Install Node.js (needed for npx firecrawl-mcp)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy deno configuration files
COPY deno.json deno.lock ./

# Copy source files
COPY server.ts ./
COPY utils ./utils

# Cache dependencies
RUN deno install --entrypoint server.ts

# Expose port
EXPOSE 8080

ENV PORT=8080

CMD ["deno", "run", "-A", "server.ts"]
