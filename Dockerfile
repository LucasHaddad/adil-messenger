# Use Node.js LTS version
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy source code
COPY . .

# Install dependencies
RUN yarn install --frozen-lockfile

# Build the application
RUN yarn build

# Use Node.js LTS version for production
FROM node:22-slim AS production

# Add certificates
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files for production dependencies
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy the built application
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]