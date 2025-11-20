# ArcQubit Platform - Deployment Guide

This guide provides step-by-step instructions for deploying the ArcQubit Knowledge Work Platform to staging and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Staging Deployment](#staging-deployment)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Migrations](#database-migrations)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Backup & Disaster Recovery](#backup--disaster-recovery)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker**: 24.0+ with Compose V2
- **Node.js**: 20.0+ (for local development)
- **Git**: For version control
- **OpenSSL**: For generating secrets

### Required Infrastructure

#### Minimum Specifications

**Staging Environment:**
- 2 vCPU, 8GB RAM
- 100GB SSD storage
- PostgreSQL 16+
- Redis 7+
- Object storage (MinIO or S3)

**Production Environment:**
- 4+ vCPU, 16GB+ RAM
- 500GB+ SSD storage
- PostgreSQL 16+ (with replication)
- Redis 7+ (with persistence/cluster)
- Object storage with versioning
- Load balancer
- CDN (optional but recommended)

### Network Requirements

- **Ports**: 80 (HTTP), 443 (HTTPS), 5432 (PostgreSQL), 6379 (Redis)
- **Outbound**: HTTPS (443) for API calls
- **DNS**: Configured A records for your domain

## Staging Deployment

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/stella-core.git
cd stella-core
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.staging.example .env.staging

# Generate JWT secret
openssl rand -base64 32

# Edit .env.staging with your configuration
nano .env.staging
```

**Required Configuration:**

```bash
# Generate these with: openssl rand -base64 32
JWT_SECRET=your_generated_secret_here
POSTGRES_PASSWORD=secure_password_here
REDIS_PASSWORD=secure_password_here
MINIO_ROOT_PASSWORD=secure_password_here
MINIO_APP_PASSWORD=secure_password_here
```

### Step 3: Deploy Staging Environment

```bash
# Run automated deployment
./scripts/deploy-staging.sh
```

This script will:
1. ✅ Validate environment configuration
2. ✅ Build Docker images
3. ✅ Start infrastructure services
4. ✅ Run database migrations
5. ✅ Generate Prisma client
6. ✅ Start application services
7. ✅ Run health checks

### Step 4: Verify Deployment

```bash
# Run health checks
./scripts/health-check.sh

# Check service logs
docker-compose -f docker-compose.staging.yml logs -f

# Access services
open http://localhost:3000        # Web Application
open http://localhost:9001        # MinIO Console
```

### Step 5: Run Integration Tests

```bash
# Install dependencies (if not already done)
npm install

# Run integration tests against staging
npm run test:integration

# Run all tests
npm run test:all
```

## Production Deployment

### Architecture Overview

```
                                 ┌─────────────┐
                                 │   CDN       │
                                 └──────┬──────┘
                                        │
                                 ┌──────▼──────┐
                                 │Load Balancer│
                                 └──────┬──────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │  Web App 1  │    │  Web App 2  │    │  Web App 3  │
             └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │ PostgreSQL  │    │Redis Cluster│    │  S3/MinIO   │
             │  (Primary)  │    │             │    │             │
             └──────┬──────┘    └─────────────┘    └─────────────┘
                    │
             ┌──────▼──────┐
             │ PostgreSQL  │
             │  (Replica)  │
             └─────────────┘
```

### Step 1: Infrastructure Setup

#### Option A: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml arcqubit

# Scale services
docker service scale arcqubit_web=3
docker service scale arcqubit_worker=5
```

#### Option B: Kubernetes (Helm Chart)

```bash
# Add Helm repository
helm repo add arcqubit https://helm.arcqubit.com

# Install chart
helm install arcqubit arcqubit/arcqubit-platform \
  --namespace production \
  --create-namespace \
  --values values.production.yaml

# Check status
kubectl get pods -n production
```

#### Option C: Cloud Platform (AWS/GCP/Azure)

See platform-specific guides:
- [AWS Deployment Guide](./docs/deployment/aws.md)
- [GCP Deployment Guide](./docs/deployment/gcp.md)
- [Azure Deployment Guide](./docs/deployment/azure.md)

### Step 2: Database Setup

#### PostgreSQL Configuration

```sql
-- Create production database
CREATE DATABASE arcqubit_production;

-- Create user
CREATE USER arcqubit WITH PASSWORD 'secure_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE arcqubit_production TO arcqubit;

-- Enable extensions
\c arcqubit_production
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

#### Run Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://arcqubit:password@prod-db:5432/arcqubit_production"

# Run migrations
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Verify
npx prisma db push --accept-data-loss --skip-generate
```

### Step 3: SSL/TLS Configuration

#### Using Let's Encrypt

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
certbot renew --dry-run
```

#### Using Custom Certificate

```bash
# Copy certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# Set permissions
chmod 600 nginx/ssl/key.pem
```

### Step 4: Production Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database (use read-replica for reads)
DATABASE_URL=postgresql://arcqubit:password@prod-db-primary:5432/arcqubit_production
DATABASE_READ_URL=postgresql://arcqubit:password@prod-db-replica:5432/arcqubit_production
DATABASE_POOL_SIZE=50
DATABASE_SSL=true

# Redis (use cluster endpoints)
REDIS_HOST=redis-cluster.prod
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
REDIS_TLS=true

# Storage (production S3)
STORAGE_PROVIDER=s3
S3_BUCKET=arcqubit-prod-documents
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Security
JWT_SECRET=production_secret_here
SESSION_SECRET=production_session_secret

# Monitoring
SENTRY_DSN=https://public@sentry.io/project
DATADOG_API_KEY=your_api_key
ENABLE_APM=true

# Features
ENABLE_PLUGINS=true
ENABLE_AI_ASSISTANT=true
ENABLE_PQC=true
ENABLE_SSO=true
ENABLE_MFA=true
```

### Step 5: Deploy to Production

```bash
# Pull latest code
git pull origin main

# Build production images
docker-compose -f docker-compose.prod.yml build

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm web npx prisma migrate deploy

# Start services with zero-downtime
docker-compose -f docker-compose.prod.yml up -d --remove-orphans

# Verify health
./scripts/health-check.sh production
```

## Environment Configuration

### Security Best Practices

1. **Secrets Management**
   ```bash
   # Use environment variables, never commit secrets
   # Use AWS Secrets Manager, HashiCorp Vault, or similar

   # Rotate secrets regularly
   ./scripts/rotate-secrets.sh
   ```

2. **Network Security**
   ```bash
   # Configure firewall rules
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable

   # Use private networks for internal services
   # Only expose load balancer publicly
   ```

3. **Access Control**
   ```bash
   # Limit database access to app servers only
   # Use security groups / network policies
   # Enable audit logging
   ```

### Rate Limiting Configuration

Adjust based on your traffic patterns:

```bash
# .env.production
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000    # Per user per window
AUTH_RATE_LIMIT_MAX_REQUESTS=10 # Login attempts
```

### Cache Configuration

```bash
# Redis cache sizes
CACHE_TTL_USER=600         # 10 minutes
CACHE_TTL_DOCUMENT=300     # 5 minutes
CACHE_TTL_SEARCH=120       # 2 minutes

# Redis max memory
REDIS_MAX_MEMORY=4gb
REDIS_MAX_MEMORY_POLICY=allkeys-lru
```

## Database Migrations

### Creating Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_feature --schema=packages/database/prisma/schema.prisma

# Review migration SQL
cat packages/database/prisma/migrations/*/migration.sql
```

### Applying Migrations

```bash
# Staging
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Production (with backup first)
./scripts/backup-database.sh
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### Rolling Back Migrations

```bash
# Identify migration to rollback
npx prisma migrate status

# Manual rollback (no automatic rollback in Prisma)
psql $DATABASE_URL < packages/database/prisma/migrations/*/migration.sql.rollback
```

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Application health
curl http://localhost:3000/api/health

# Database health
curl http://localhost:3000/api/health/db

# Redis health
curl http://localhost:3000/api/health/cache

# Storage health
curl http://localhost:3000/api/health/storage
```

### Monitoring Setup

#### Sentry (Error Tracking)

```bash
# Install Sentry
npm install @sentry/node @sentry/nextjs

# Configure in .env
SENTRY_DSN=your_dsn_here
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### DataDog (APM & Metrics)

```bash
# Install DataDog agent
DD_API_KEY=your_key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure APM
export DD_SERVICE=arcqubit
export DD_ENV=production
export DD_VERSION=$(git rev-parse --short HEAD)
```

#### Prometheus + Grafana

```bash
# Add metrics endpoint
# GET /api/metrics

# Configure Prometheus scraping
# See: prometheus.yml

# Import Grafana dashboards
# See: grafana/dashboards/
```

### Log Aggregation

```bash
# Using ELK Stack
docker-compose -f docker-compose.logging.yml up -d

# Using Cloud Logging
# AWS CloudWatch, GCP Cloud Logging, Azure Monitor
```

## Backup & Disaster Recovery

### Database Backups

```bash
# Automated daily backups
crontab -e
0 2 * * * /path/to/scripts/backup-database.sh

# Manual backup
./scripts/backup-database.sh

# Restore from backup
./scripts/restore-database.sh backup-2024-01-20.sql.gz
```

### Application Data Backups

```bash
# Backup Redis data
redis-cli --rdb /backups/redis-$(date +%Y%m%d).rdb

# Backup object storage
aws s3 sync s3://arcqubit-documents s3://arcqubit-backups/$(date +%Y%m%d)/
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 24 hours

**Recovery Steps:**

```bash
# 1. Provision new infrastructure
terraform apply -var-file=dr.tfvars

# 2. Restore database from latest backup
./scripts/restore-database.sh latest

# 3. Restore Redis from persistence file
redis-cli --rdb appendonly.aof

# 4. Sync object storage
aws s3 sync s3://arcqubit-backups/latest/ s3://arcqubit-documents/

# 5. Deploy application
./scripts/deploy-production.sh

# 6. Verify health
./scripts/health-check.sh production

# 7. Update DNS
# Point domain to new infrastructure
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.staging.yml logs web

# Common causes:
# - Database not accessible
# - Missing environment variables
# - Port already in use

# Solutions:
docker-compose -f docker-compose.staging.yml restart
docker-compose -f docker-compose.staging.yml down && docker-compose -f docker-compose.staging.yml up -d
```

#### 2. Database Connection Failed

```bash
# Test connection
docker-compose -f docker-compose.staging.yml exec postgres psql -U arcqubit -d arcqubit_staging

# Check logs
docker-compose -f docker-compose.staging.yml logs postgres

# Verify credentials
echo $DATABASE_URL

# Restart database
docker-compose -f docker-compose.staging.yml restart postgres
```

#### 3. Redis Connection Failed

```bash
# Test connection
docker-compose -f docker-compose.staging.yml exec redis redis-cli ping

# Check auth
docker-compose -f docker-compose.staging.yml exec redis redis-cli -a $REDIS_PASSWORD ping

# Clear cache
docker-compose -f docker-compose.staging.yml exec redis redis-cli FLUSHDB
```

#### 4. High Memory Usage

```bash
# Check container stats
docker stats

# Identify memory hogs
docker-compose -f docker-compose.staging.yml top

# Restart specific service
docker-compose -f docker-compose.staging.yml restart worker

# Scale down if needed
docker-compose -f docker-compose.staging.yml up -d --scale worker=1
```

#### 5. Slow Performance

```bash
# Check database queries
# Enable slow query log in PostgreSQL
docker-compose -f docker-compose.staging.yml exec postgres \
  psql -U arcqubit -d arcqubit_staging \
  -c "ALTER SYSTEM SET log_min_duration_statement = '1000';"

# Check Redis memory
docker-compose -f docker-compose.staging.yml exec redis redis-cli INFO memory

# Check application metrics
curl http://localhost:3000/api/metrics
```

### Getting Help

- **Documentation**: https://docs.arcqubit.com
- **GitHub Issues**: https://github.com/your-org/stella-core/issues
- **Support Email**: support@arcqubit.com
- **Slack Community**: https://arcqubit.slack.com

## Appendix

### Scripts Reference

- `scripts/deploy-staging.sh` - Deploy to staging environment
- `scripts/health-check.sh` - Run health checks
- `scripts/backup-database.sh` - Backup PostgreSQL
- `scripts/restore-database.sh` - Restore from backup
- `scripts/rotate-secrets.sh` - Rotate security secrets
- `scripts/scale-workers.sh` - Scale background workers

### Configuration Files

- `docker-compose.staging.yml` - Staging environment
- `docker-compose.prod.yml` - Production environment
- `nginx/staging.conf` - Nginx configuration
- `.env.staging.example` - Environment template
- `Makefile` - Common commands

### Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| Web App | 3000 | Next.js application |
| Nginx | 80/443 | Reverse proxy |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & queue |
| MinIO | 9000/9001 | Object storage |

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
