#!/bin/bash

# ArcQubit Platform - Health Check Script
# Validates that all services are running and healthy

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Running health checks..."
echo "========================"
echo ""

FAILED_CHECKS=0

# Function to check service
check_service() {
    local name=$1
    local check_command=$2
    local expected_output=$3

    echo -n "Checking $name... "

    if output=$(eval "$check_command" 2>&1); then
        if [ -n "$expected_output" ]; then
            if echo "$output" | grep -q "$expected_output"; then
                echo -e "${GREEN}✅ Healthy${NC}"
                return 0
            else
                echo -e "${RED}❌ Unhealthy (unexpected output)${NC}"
                echo "  Expected: $expected_output"
                echo "  Got: $output"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                return 1
            fi
        else
            echo -e "${GREEN}✅ Healthy${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ Failed${NC}"
        echo "  Error: $output"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check PostgreSQL
check_service "PostgreSQL" \
    "docker-compose -f docker-compose.staging.yml exec -T postgres pg_isready -U arcqubit -d arcqubit_staging" \
    "accepting connections"

# Check Redis
check_service "Redis" \
    "docker-compose -f docker-compose.staging.yml exec -T redis redis-cli ping" \
    "PONG"

# Check MinIO
check_service "MinIO" \
    "curl -sf http://localhost:9000/minio/health/live" \
    ""

# Check Web Application
check_service "Web Application" \
    "curl -sf http://localhost:3000/api/health" \
    ""

# Check Nginx
check_service "Nginx" \
    "curl -sf http://localhost/health" \
    ""

# Check Worker Containers
echo -n "Checking Worker containers... "
WORKER_COUNT=$(docker-compose -f docker-compose.staging.yml ps -q worker 2>/dev/null | wc -l)
if [ "$WORKER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $WORKER_COUNT worker(s) running${NC}"
else
    echo -e "${RED}❌ No workers running${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo "Database Connectivity:"
echo "----------------------"

# Check database connection
check_service "Database Connection" \
    "docker-compose -f docker-compose.staging.yml exec -T postgres psql -U arcqubit -d arcqubit_staging -c 'SELECT 1;'" \
    "1 row"

# Check database tables
echo -n "Checking database schema... "
TABLE_COUNT=$(docker-compose -f docker-compose.staging.yml exec -T postgres psql -U arcqubit -d arcqubit_staging -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $TABLE_COUNT tables found${NC}"
else
    echo -e "${RED}❌ No tables found (migrations may not have run)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo "Cache Connectivity:"
echo "-------------------"

# Check Redis info
echo -n "Checking Redis memory... "
REDIS_MEMORY=$(docker-compose -f docker-compose.staging.yml exec -T redis redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
if [ -n "$REDIS_MEMORY" ]; then
    echo -e "${GREEN}✅ Using $REDIS_MEMORY${NC}"
else
    echo -e "${RED}❌ Cannot get memory info${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo "Storage:"
echo "--------"

# Check MinIO buckets
echo -n "Checking MinIO buckets... "
BUCKET_COUNT=$(docker-compose -f docker-compose.staging.yml exec -T minio mc ls myminio 2>/dev/null | wc -l)
if [ "$BUCKET_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $BUCKET_COUNT bucket(s) found${NC}"
else
    echo -e "${YELLOW}⚠️  No buckets found${NC}"
fi

echo ""
echo "Container Status:"
echo "-----------------"

docker-compose -f docker-compose.staging.yml ps

echo ""
echo "========================"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_CHECKS health check(s) failed${NC}"
    echo ""
    echo "View logs with:"
    echo "  docker-compose -f docker-compose.staging.yml logs -f"
    exit 1
fi
