#!/bin/bash
set -e

# ArcQubit Platform - Staging Deployment Script
# This script deploys the platform to a staging environment

echo "========================================="
echo "ArcQubit Platform - Staging Deployment"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.staging exists
if [ ! -f .env.staging ]; then
    echo -e "${YELLOW}⚠️  .env.staging not found!${NC}"
    echo "Creating from .env.staging.example..."
    cp .env.staging.example .env.staging
    echo -e "${RED}❌ Please edit .env.staging with your configuration before continuing${NC}"
    exit 1
fi

# Load environment variables
set -a
source .env.staging
set +a

echo "Step 1: Validating environment..."
echo "-----------------------------------"

# Check required variables
REQUIRED_VARS=(
    "JWT_SECRET"
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "CHANGE_ME"* ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing or unchanged required variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✅ Environment validation passed${NC}"
echo ""

echo "Step 2: Building Docker images..."
echo "-----------------------------------"
docker-compose -f docker-compose.staging.yml build --no-cache
echo -e "${GREEN}✅ Docker images built${NC}"
echo ""

echo "Step 3: Starting infrastructure services..."
echo "-----------------------------------"
docker-compose -f docker-compose.staging.yml up -d postgres redis minio

echo "Waiting for services to be healthy..."
sleep 10

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
until docker-compose -f docker-compose.staging.yml exec -T postgres pg_isready -U arcqubit -d arcqubit_staging > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✅${NC}"

# Wait for Redis
echo -n "Waiting for Redis..."
until docker-compose -f docker-compose.staging.yml exec -T redis redis-cli -a "${REDIS_PASSWORD}" ping > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✅${NC}"

# Wait for MinIO
echo -n "Waiting for MinIO..."
until curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✅${NC}"

echo ""

echo "Step 4: Running database migrations..."
echo "-----------------------------------"
docker-compose -f docker-compose.staging.yml run --rm web npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

echo "Step 5: Generating Prisma client..."
echo "-----------------------------------"
docker-compose -f docker-compose.staging.yml run --rm web npx prisma generate --schema=packages/database/prisma/schema.prisma
echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

echo "Step 6: Starting application services..."
echo "-----------------------------------"
docker-compose -f docker-compose.staging.yml up -d web worker nginx

echo "Waiting for application to be ready..."
sleep 15

# Wait for web application
echo -n "Waiting for web application..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e " ${RED}❌ Timeout${NC}"
        echo "Application failed to start. Check logs with: docker-compose -f docker-compose.staging.yml logs web"
        exit 1
    fi
done
echo -e " ${GREEN}✅${NC}"

echo ""

echo "Step 7: Running health checks..."
echo "-----------------------------------"
./scripts/health-check.sh

echo ""
echo "========================================="
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "========================================="
echo ""
echo "Services:"
echo "  - Web Application: http://localhost:3000"
echo "  - API: http://localhost/api"
echo "  - MinIO Console: http://localhost:9001"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.staging.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.staging.yml down"
echo "  - Restart: docker-compose -f docker-compose.staging.yml restart"
echo "  - Run tests: npm run test:integration"
echo ""
