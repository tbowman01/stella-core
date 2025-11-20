#!/usr/bin/env node

/**
 * Worker process for BullMQ job processing
 * Run with: npm run worker
 */

import './workers';
import { setupRecurringJobs } from './jobs';

async function main() {
  console.log('🚀 Starting BullMQ workers...');

  // Setup recurring jobs
  await setupRecurringJobs();

  console.log('✅ Workers started and ready to process jobs');
  console.log('Press CTRL+C to stop');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down workers...');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Worker startup failed:', error);
  process.exit(1);
});
