#!/bin/bash

# ALB Market Development Environment Startup Script
# This script starts all services needed for local development

set -e

echo "🚀 Starting ALB Market Development Environment..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install pnpm first.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    pnpm install
fi

# Start Neo4j with Docker Compose
echo -e "${BLUE}🗄️  Starting Neo4j database...${NC}"
docker-compose -f docker-compose.dev.yml up -d neo4j

# Wait for Neo4j to be ready
echo -e "${YELLOW}⏳ Waiting for Neo4j to be ready...${NC}"
MAX_TRIES=30
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
    if curl -s http://localhost:7474 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Neo4j is ready!${NC}"
        break
    fi
    TRIES=$((TRIES + 1))
    if [ $TRIES -eq $MAX_TRIES ]; then
        echo -e "${RED}❌ Neo4j failed to start after 30 seconds${NC}"
        exit 1
    fi
    sleep 1
done

# Check if database needs restoration
echo -e "${BLUE}🔍 Checking database status...${NC}"
ITEM_COUNT=$(docker exec alb-market-neo4j cypher-shell -u neo4j -p albmarket123 --format plain "MATCH (i:Item) RETURN count(i) as count" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$ITEM_COUNT" -eq "0" ] || [ -z "$ITEM_COUNT" ]; then
    echo -e "${YELLOW}📥 Database is empty. Restoring from backup...${NC}"
    
    # Find the latest backup file
    LATEST_BACKUP=$(ls -t packages/database/backups/*.json 2>/dev/null | head -1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        echo -e "${BLUE}   Using backup: $(basename $LATEST_BACKUP)${NC}"
        cd packages/database && npm run restore && cd ../..
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️  No backup file found. Starting with empty database.${NC}"
    fi
else
    echo -e "${GREEN}✅ Database already contains $ITEM_COUNT items${NC}"
fi

# Start backend and frontend in development mode
echo -e "${BLUE}🚀 Starting development servers...${NC}"
echo -e "${YELLOW}   Backend will run on: http://localhost:4000${NC}"
echo -e "${YELLOW}   Frontend will run on: http://localhost:3000${NC}"
echo -e "${YELLOW}   Neo4j Browser: http://localhost:7474${NC}"

# Run development servers
pnpm dev

# This line will only be reached if pnpm dev is interrupted
echo -e "${YELLOW}⚠️  Development servers stopped${NC}"