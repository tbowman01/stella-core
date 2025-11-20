#!/bin/bash
set -e

# ArcQubit Platform - Database Initialization Script
# This script runs during PostgreSQL container startup

echo "Initializing ArcQubit database..."

# Create the pgvector extension
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable pgvector extension for embeddings
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Enable UUID generation
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Enable pg_trgm for full-text search
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    -- Show installed extensions
    SELECT extname, extversion FROM pg_extension;
EOSQL

echo "Database initialization complete!"
