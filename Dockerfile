# Use Node.js LTS version
FROM node:22-alpine AS build

# Set working directory
WORKDIR /usr/src/app

# Copy source code
COPY . .

# Install dependencies
RUN yarn install --frozen-lockfile

# Build the application
RUN yarn build

# Use Node.js LTS version
FROM node:22-alpine AS production

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json yarn.lock node_modules dist ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]