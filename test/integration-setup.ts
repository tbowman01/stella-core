/**
 * Integration Test Setup
 * Sets up real services for integration testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arcqubit_test';
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';
process.env.REDIS_DB = '1'; // Use DB 1 for tests
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';

console.log('🔧 Integration Test Environment:');
console.log('  - Database:', process.env.DATABASE_URL);
console.log('  - Redis:', `${process.env.REDIS_HOST}:${process.env.REDIS_PORT} (DB ${process.env.REDIS_DB})`);
console.log('');

let prisma: any;
let redis: any;

beforeAll(async () => {
  console.log('🚀 Setting up integration test environment...');

  try {
    // Import Prisma client
    const { prisma: prismaClient } = await import('@arcqubit/database');
    prisma = prismaClient;

    // Test database connection
    console.log('📊 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');

    // Run migrations
    console.log('🔄 Running database migrations...');
    try {
      execSync('npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Migrations complete');
    } catch (error) {
      console.log('⚠️  Migration warning (may already be applied):', error instanceof Error ? error.message : error);
    }

    // Test Redis connection
    console.log('🔌 Testing Redis connection...');
    const { getRedisClient } = await import('@arcqubit/cache');
    redis = getRedisClient();
    await redis.ping();
    console.log('✅ Redis connected');

    console.log('✅ Integration test environment ready!\n');
  } catch (error) {
    console.error('❌ Failed to set up integration test environment:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('\n🧹 Cleaning up integration test environment...');

  try {
    // Disconnect Prisma
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Database disconnected');
    }

    // Disconnect Redis
    if (redis) {
      await redis.quit();
      console.log('✅ Redis disconnected');
    }

    console.log('✅ Cleanup complete!\n');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
});

// Clean up test data before each test
beforeEach(async () => {
  if (redis) {
    // Flush test Redis DB
    await redis.flushdb();
  }
});

// Global test utilities
export { prisma, redis };
