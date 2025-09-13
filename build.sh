#!/bin/sh

# Build script for minimal Docker image

echo "🚀 Building minimal Nyla Bot Docker image..."

# Clean previous builds
docker image prune -f

# Build with minimal layers
docker build \
  --no-cache \
  --compress \
  --rm \
  --force-rm \
  --tag nyla-bot:latest \
  --tag nyla-bot:$(date +%Y%m%d) \
  .

# Show image size
echo "📦 Image built successfully!"
docker images nyla-bot:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Optional: Save image for transfer
# docker save -o nyla-bot.tar nyla-bot:latest
# echo "💾 Image saved to nyla-bot.tar"