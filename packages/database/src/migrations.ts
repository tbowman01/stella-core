/**
 * Custom migration utilities for pgvector and other extensions
 */

import { prisma } from './index';

/**
 * Initialize pgvector extension
 * This should be run as part of the first migration
 */
export async function initializePgVector() {
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✓ pgvector extension initialized');
  } catch (error) {
    console.error('Failed to initialize pgvector:', error);
    throw error;
  }
}

/**
 * Add embedding column to documents table
 * Note: Prisma doesn't natively support vector type, so we use raw SQL
 */
export async function addEmbeddingColumn() {
  try {
    await prisma.$executeRaw`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_documents_embedding
      ON documents
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;

    console.log('✓ Embedding column and index created');
  } catch (error) {
    console.error('Failed to add embedding column:', error);
    throw error;
  }
}

/**
 * Add full-text search column and index
 */
export async function addFullTextSearch() {
  try {
    await prisma.$executeRaw`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_documents_fts
      ON documents
      USING GIN (fts_vector)
    `;

    // Create trigger to automatically update fts_vector
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION documents_fts_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.fts_vector := to_tsvector('english', coalesce(NEW.name, '') || ' ' || coalesce(NEW.content_text, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `;

    await prisma.$executeRaw`
      CREATE TRIGGER documents_fts_update
      BEFORE INSERT OR UPDATE ON documents
      FOR EACH ROW
      EXECUTE FUNCTION documents_fts_trigger()
    `;

    console.log('✓ Full-text search column and trigger created');
  } catch (error) {
    console.error('Failed to add full-text search:', error);
    throw error;
  }
}

/**
 * Set up row-level security for multi-tenancy
 * This ensures that queries automatically filter by tenant_id
 */
export async function setupRowLevelSecurity() {
  try {
    // Enable RLS on all tenant-scoped tables
    const tables = [
      'users',
      'workspaces',
      'documents',
      'audit_logs',
      'compliance_controls',
      'qbom_entries',
      'plugins',
    ];

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

      // Create policy to filter by tenant_id
      await prisma.$executeRawUnsafe(`
        CREATE POLICY IF NOT EXISTS ${table}_tenant_isolation ON ${table}
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      `);
    }

    console.log('✓ Row-level security policies created');
  } catch (error) {
    console.error('Failed to setup row-level security:', error);
    throw error;
  }
}

/**
 * Run all post-deployment migrations
 */
export async function runPostDeploymentMigrations() {
  console.log('Running post-deployment migrations...');

  await initializePgVector();
  await addEmbeddingColumn();
  await addFullTextSearch();
  // Note: RLS disabled by default in development
  // await setupRowLevelSecurity();

  console.log('✓ All post-deployment migrations completed');
}
