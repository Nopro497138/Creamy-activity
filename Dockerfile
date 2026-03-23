FROM node:20-slim

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json ./

# Install ALL dependencies (including vite for build)
RUN npm install

# Copy all source files
COPY . .

# Build the Vite client → dist/
RUN npm run build

# Verify dist was created
RUN ls -la dist/ && echo "✅ Build successful"

# Start the Express server
CMD ["node", "server.js"]
