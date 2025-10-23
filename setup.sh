#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Adil Messenger API Setup Script${NC}"
echo "======================================"

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null | cut -d 'v' -f2)
if [[ -z "$NODE_VERSION" ]]; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f1)
if [[ $MAJOR_VERSION -lt 18 ]]; then
    echo -e "${YELLOW}⚠️  Warning: Node.js version $NODE_VERSION detected${NC}"
    echo -e "${YELLOW}   Recommended: Node.js 18+${NC}"
    echo -e "${YELLOW}   Some packages may not work correctly${NC}"
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running on localhost:5432${NC}"
    echo "Options:"
    echo "1. Start local PostgreSQL service"
    echo "2. Use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
    echo "3. Use docker-compose: docker-compose up -d postgres"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
if command -v yarn >/dev/null 2>&1; then
    yarn install
else
    echo -e "${YELLOW}⚠️  Yarn not found, using npm...${NC}"
    npm install
fi

# Check if .env exists
if [[ ! -f .env ]]; then
    echo -e "${YELLOW}⚠️  .env file not found, creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}   Please edit .env with your database credentials${NC}"
fi

# Create database if it doesn't exist
echo -e "${BLUE}🗄️  Setting up database...${NC}"
createdb adil_messenger 2>/dev/null || echo -e "${YELLOW}   Database may already exist${NC}"

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Run: yarn start:dev (or npm run start:dev)"
echo "3. Visit: http://localhost:3000/api/docs"