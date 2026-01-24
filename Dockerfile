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

# Copy package files first (for better caching)
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm ci

# Copy deno configuration files
COPY deno.json deno.lock ./

# Copy source files
COPY . .

# Cache dependencies using deno.json import map
# This will download @zypher/agent from jsr and rxjs-for-await from npm
RUN deno install --entrypoint server.ts

# Build Next.js app (creates .next/standalone directory)
RUN npm run build

# Expose the port (Railway will override with PORT env var)
EXPOSE 3000

# Set default environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV DENO_SERVER_URL=http://localhost:8000

# Create startup script that runs both Next.js and Deno server
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Deno server runs on fixed port 8000\n\
export DENO_PORT=8000\n\
\n\
# Next.js runs on Railway PORT (defaults to 3000)\n\
export NEXT_PORT=${PORT:-3000}\n\
\n\
# Configure Next.js to proxy to local Deno server\n\
export DENO_SERVER_URL=http://localhost:${DENO_PORT}\n\
\n\
echo "=== Starting Hireal Zypher Application ==="\n\
echo "Deno server will run on port ${DENO_PORT}"\n\
echo "Next.js server will run on port ${NEXT_PORT}"\n\
\n\
# Start Deno server in background with fixed port\n\
echo "Starting Deno server..."\n\
PORT=${DENO_PORT} deno run -A server.ts > /tmp/deno.log 2>&1 &\n\
DENO_PID=$!\n\
\n\
# Wait for Deno server to be ready\n\
echo "Waiting for Deno server to start..."\n\
DENO_READY=false\n\
for i in {1..30}; do\n\
  if curl -s http://localhost:${DENO_PORT}/health > /dev/null 2>&1; then\n\
    echo "✓ Deno server is ready!"\n\
    DENO_READY=true\n\
    break\n\
  fi\n\
  sleep 1\n\
done\n\
\n\
if [ "$DENO_READY" = false ]; then\n\
  echo "✗ Deno server failed to start. Logs:"\n\
  cat /tmp/deno.log\n\
  exit 1\n\
fi\n\
\n\
# Start Next.js server on Railway PORT\n\
echo "Starting Next.js server..."\n\
PORT=${NEXT_PORT} npm start > /tmp/next.log 2>&1 &\n\
NEXT_PID=$!\n\
\n\
# Wait a moment for Next.js to start\n\
sleep 3\n\
\n\
# Check if Next.js is running\n\
if ! kill -0 $NEXT_PID 2>/dev/null; then\n\
  echo "✗ Next.js server failed to start. Logs:"\n\
  cat /tmp/next.log\n\
  kill $DENO_PID 2>/dev/null || true\n\
  exit 1\n\
fi\n\
\n\
echo "✓ Next.js server is running"\n\
echo "=== Application is ready ==="\n\
\n\
# Function to cleanup on exit\n\
cleanup() {\n\
  echo "Shutting down..."\n\
  kill $DENO_PID 2>/dev/null || true\n\
  kill $NEXT_PID 2>/dev/null || true\n\
  exit 0\n\
}\n\
\n\
# Trap signals\n\
trap cleanup SIGTERM SIGINT\n\
\n\
# Wait for either process to exit\n\
wait -n\n\
cleanup\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run the startup script
CMD ["/app/start.sh"]
