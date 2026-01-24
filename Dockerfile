# Use Debian-based Deno image for better compatibility with npx and node tools
FROM denoland/deno:debian

# Set working directory
WORKDIR /app

# Install Node.js and npm (required for npx and firecrawl-mcp)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy deno configuration files first (for better caching)
COPY deno.json deno.lock ./

# Copy source files
COPY . .

# Cache dependencies using deno.json import map
# This will download @zypher/agent from jsr and rxjs-for-await from npm
RUN deno install --entrypoint server.ts

# Expose the port (Railway will override with PORT env var)
EXPOSE 8000

# Set default environment variable for port
ENV PORT=8000

# Run the server
CMD ["deno", "run", "-A", "server.ts"]
