# SPARC Architecture: ArcQubit Knowledge Work Platform

**Version:** 1.0
**Date:** November 19, 2025
**Methodology:** SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)

---

## Overview

This document outlines the development approach for the ArcQubit Knowledge Work Platform using the SPARC methodology. The platform is a quantum-ready, AI-powered knowledge management system designed for regulated industries requiring post-quantum cryptographic protection.

---

## Phase 1: Specification

### 1.1 Core Requirements Summary

**MVP Scope (6-9 months, 2-developer team):**

- Multi-tenant document management with quantum-ready encryption
- Role-based access control (RBAC) with SSO/MFA
- Full-text and semantic search (PostgreSQL + pgvector)
- AI Assistant with PHI/PII redaction
- Workspace and matter management
- Audit logging and compliance workflows
- PQC Scanner plugin integration
- Data loss prevention (DLP) controls

**Out of Scope for MVP:**
- Native mobile/desktop applications
- Real-time co-editing
- Knowledge graph visualization (Neo4j)
- Plugin marketplace
- Email journaling

### 1.2 Technical Constraints

- **Team Size:** 2 developers initially
- **Timeline:** 6-9 months to design partner MVP
- **Infrastructure:** Cloud-native, Kubernetes-optional (Phase 2)
- **Security:** SOC 2 Type I compliance target
- **Performance:** 99.9% uptime, <2s dashboard load

### 1.3 Success Metrics

- Design partner NPS ≥ 60
- Average DAU per org ≥ 50
- Time to produce audit report reduced by 50%
- 70% of crypto assets discovered automatically
- 50% PQC migration coverage for long-lived data

---

## Phase 2: Pseudocode

### 2.1 System Flow Diagrams

#### Authentication Flow
```
User → Login Request → SSO/MFA Check → JWT Generation → PQC-signed Token → Client
                           ↓
                    Audit Log Entry
```

#### Document Upload Flow
```
User → Upload Request → Virus Scan → Extract Metadata → PQC Encrypt
                           ↓              ↓                ↓
                    Blob Storage    PostgreSQL      Generate Embeddings
                                                           ↓
                                                      pgvector Index
```

#### AI Assistant Query Flow
```
User Query → Intent Analysis → Hybrid Search (FTS + Semantic)
                                    ↓
                           Context Window Management
                                    ↓
                            LLM Generation (Claude/GPT)
                                    ↓
                           PHI/PII Redaction Layer
                                    ↓
                            Citation Extraction
                                    ↓
                            Response + Audit Log
```

#### PQC Scanner Integration Flow
```
Admin → Configure Scan Target → Schedule Scan → Execute Analysis
                                      ↓              ↓
                                  BullMQ Queue   Git/Repo Access
                                                      ↓
                                              Crypto Detection
                                                      ↓
                                              Generate QBOM
                                                      ↓
                                          Store Results (PostgreSQL)
                                                      ↓
                                              Dashboard Update
```

### 2.2 Core Algorithms

#### Multi-Tenant Data Isolation
```typescript
function getTenantContext(userId: string): TenantContext {
  // Resolve user to tenant
  const tenant = db.query('SELECT tenant_id FROM users WHERE id = ?', userId)

  // Set row-level security context
  db.execute('SET app.current_tenant = ?', tenant.id)

  // All subsequent queries auto-filtered by tenant_id
  return { tenantId: tenant.id, userId }
}
```

#### PQC Key Management
```typescript
function encryptDocument(data: Buffer, tenantId: string): EncryptedBlob {
  // Generate ephemeral symmetric key
  const symmetricKey = crypto.randomBytes(32) // AES-256

  // Encrypt data with AES-256-GCM
  const encrypted = aesGcmEncrypt(data, symmetricKey)

  // Wrap symmetric key with PQC (ML-KEM)
  const tenantPublicKey = getMLKEMPublicKey(tenantId)
  const wrappedKey = mlKemEncapsulate(symmetricKey, tenantPublicKey)

  // Sign with PQC (ML-DSA)
  const signature = mlDsaSign(encrypted, tenantPrivateKey)

  return {
    ciphertext: encrypted,
    wrappedKey: wrappedKey,
    signature: signature,
    algorithm: 'AES-256-GCM + ML-KEM + ML-DSA',
    timestamp: Date.now()
  }
}
```

#### Hybrid Search Ranking
```typescript
function hybridSearch(query: string, tenantId: string): SearchResult[] {
  // Full-text search with PostgreSQL
  const ftsResults = db.query(`
    SELECT id, ts_rank(fts_vector, query) as fts_score
    FROM documents
    WHERE tenant_id = ? AND fts_vector @@ to_tsquery(?)
  `, [tenantId, query])

  // Semantic search with pgvector
  const queryEmbedding = await generateEmbedding(query)
  const vecResults = db.query(`
    SELECT id, 1 - (embedding <=> ?) as semantic_score
    FROM documents
    WHERE tenant_id = ?
    ORDER BY embedding <=> ?
    LIMIT 100
  `, [queryEmbedding, tenantId, queryEmbedding])

  // Combine and re-rank
  return rerank(ftsResults, vecResults, weights: { fts: 0.6, semantic: 0.4 })
}
```

---

## Phase 3: Architecture

### 3.1 System Architecture (MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Next.js)                   │
│  - Responsive Web UI (Desktop, Tablet, Mobile Browser)      │
│  - TypeScript + Tailwind CSS + shadcn/ui                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS + TLS 1.3 (+ Hybrid PQC)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)                  │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ Auth Service │ Doc Service  │ Search Service           │ │
│  ├──────────────┼──────────────┼──────────────────────────┤ │
│  │ Workspace    │ AI Service   │ Compliance Service       │ │
│  ├──────────────┼──────────────┼──────────────────────────┤ │
│  │ Plugin Mgr   │ PQC Service  │ Audit Service            │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬───────────────┐
        ▼              ▼              ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────────┐
│ PostgreSQL  │ │ Blob Storage│ │  Redis   │ │  External    │
│    16       │ │(Azure/MinIO)│ │  Cache   │ │  Services    │
│             │ │             │ │    +     │ │              │
│ - Metadata  │ │ - Documents │ │ BullMQ   │ │ - SSO (Okta) │
│ - Users     │ │ - Binaries  │ │  Jobs    │ │ - Claude API │
│ - Audit Log │ │             │ │          │ │ - liboqs     │
│ - FTS Index │ │             │ │          │ │              │
│ - pgvector  │ │             │ │          │ │              │
└─────────────┘ └─────────────┘ └──────────┘ └──────────────┘
```

### 3.2 Database Schema (PostgreSQL)

#### Core Tables

```sql
-- Tenants (Organizations)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  pqc_enabled BOOLEAN DEFAULT true,
  ml_kem_public_key BYTEA,
  ml_dsa_public_key BYTEA,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL, -- admin, manager, contributor, viewer
  mfa_enabled BOOLEAN DEFAULT false,
  sso_provider VARCHAR(50),
  sso_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Workspaces (Matters/Projects)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES workspaces(id),
  classification VARCHAR(50), -- public, internal, confidential, restricted
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  storage_path VARCHAR(500), -- Blob storage path
  version INT DEFAULT 1,
  classification VARCHAR(50),
  metadata JSONB DEFAULT '{}',

  -- Encryption metadata
  encryption_algorithm VARCHAR(100),
  wrapped_key BYTEA,
  pqc_signature BYTEA,

  -- Search indexes
  content_text TEXT,
  fts_vector TSVECTOR,
  embedding vector(1536), -- pgvector for semantic search

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_fts ON documents USING GIN(fts_vector);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat(embedding vector_cosine_ops);

-- Audit Logs (Immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- login, upload, download, search, export, etc.
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, timestamp DESC);

-- Compliance Controls
CREATE TABLE compliance_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  framework VARCHAR(50), -- soc2, cmmc, nist_rmf
  control_id VARCHAR(100),
  control_name VARCHAR(255),
  description TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50), -- met, partial, not_met
  evidence_ids UUID[],
  last_reviewed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QBOM (Quantum Bill of Materials)
CREATE TABLE qbom_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  component_name VARCHAR(255),
  component_type VARCHAR(100), -- library, service, algorithm
  crypto_algorithms JSONB, -- ["AES-256-GCM", "ML-KEM-768", "ML-DSA-65"]
  quantum_safe BOOLEAN,
  migration_status VARCHAR(50), -- not_started, in_progress, completed
  scan_date TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Plugin Configurations
CREATE TABLE plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  plugin_name VARCHAR(100), -- pqc-scanner, q-cmm, deep-research
  enabled BOOLEAN DEFAULT false,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, plugin_name)
);
```

### 3.3 Technology Stack Details

#### Backend Stack
```json
{
  "runtime": "Node.js 20 LTS",
  "language": "TypeScript 5.3+",
  "framework": "Next.js 14 (App Router + API Routes)",
  "orm": "Prisma or Drizzle ORM",
  "validation": "Zod",
  "testing": "Vitest + Playwright"
}
```

#### Frontend Stack
```json
{
  "framework": "Next.js 14 + React 18",
  "language": "TypeScript",
  "styling": "Tailwind CSS 3",
  "components": "shadcn/ui + Radix UI",
  "state": "Zustand or React Query",
  "forms": "React Hook Form + Zod"
}
```

#### Infrastructure Stack
```json
{
  "database": "PostgreSQL 16 (with pgvector extension)",
  "cache": "Redis 7",
  "storage": "Azure Blob Storage or MinIO",
  "queue": "BullMQ",
  "pqc": "liboqs (Open Quantum Safe)",
  "ai": "Anthropic Claude API + OpenAI API"
}
```

### 3.4 Security Architecture

#### Defense in Depth Layers

1. **Network Layer**
   - TLS 1.3 with forward secrecy
   - Hybrid PQC cipher suites (as available)
   - IP allowlisting (optional)
   - DDoS protection (Cloudflare/Azure Front Door)

2. **Application Layer**
   - SSO/SAML 2.0/OIDC
   - MFA enforcement
   - RBAC with least privilege
   - CSRF protection
   - Content Security Policy (CSP)
   - Rate limiting

3. **Data Layer**
   - Encryption at rest (AES-256-GCM + ML-KEM wrapping)
   - PQC signatures for integrity (ML-DSA)
   - Row-level security (PostgreSQL RLS)
   - Customer-managed keys (CMEK) option
   - Immutable audit logs

4. **Egress Layer**
   - Classification-based export policies
   - Visible watermarking
   - Copy/paste restrictions (configurable)
   - Export audit logging

---

## Phase 4: Refinement

### 4.1 Performance Optimization Strategies

#### Database Optimization
- Partition audit_logs by tenant_id and time (monthly)
- Use materialized views for compliance dashboards
- Implement connection pooling (PgBouncer)
- Optimize pgvector indexes (IVFFlat → HNSW as data grows)

#### Caching Strategy
```typescript
// Multi-tier caching
L1: In-memory cache (Node.js process) → 5min TTL
L2: Redis cache → 1hr TTL
L3: PostgreSQL read replica
```

#### Async Processing
- Document processing (extraction, embedding) → BullMQ
- PQC Scanner jobs → BullMQ with priority queue
- Email notifications → BullMQ
- Export generation → BullMQ with progress tracking

### 4.2 Scalability Considerations

**Vertical Scaling (MVP → 1,000 users)**
- Single API server + DB instance
- Redis single node
- Blob storage scales automatically

**Horizontal Scaling (1,000+ users)**
- Multiple API server instances (stateless)
- PostgreSQL read replicas
- Redis Cluster
- CDN for static assets

**Data Growth Management**
- Archive old documents to cold storage
- Summarize old audit logs (retain raw for compliance period)
- Implement document lifecycle policies

### 4.3 AI Safety & Quality

#### PHI/PII Redaction Pipeline
```typescript
async function redactSensitiveInfo(text: string): Promise<RedactedResult> {
  // Multi-stage detection
  const detected = await Promise.all([
    detectPHI(text),      // HIPAA identifiers
    detectPII(text),      // SSN, credit cards, etc.
    detectNames(text),    // NER model
    detectEmails(text),   // Regex + validation
  ])

  // Apply redaction masks
  let redacted = text
  for (const entity of detected.flat()) {
    redacted = redacted.replace(entity.value, `[${entity.type} REDACTED]`)
  }

  return {
    original: text,
    redacted: redacted,
    entities: detected.flat(),
    redactionCount: detected.flat().length
  }
}
```

#### Hallucination Mitigation
- Require citations for all factual claims
- Implement confidence scoring
- User feedback loop (thumbs up/down)
- Periodic offline evaluation with ground truth

---

## Phase 5: Completion

### 5.1 Testing Strategy

#### Unit Tests (Vitest)
- All core services: Auth, Document, Search, PQC
- Target: >80% code coverage
- Mock external dependencies (AI APIs, blob storage)

#### Integration Tests
- API endpoint tests with real database (test container)
- PQC encryption/decryption round-trip
- Multi-tenant isolation verification
- Audit log completeness

#### E2E Tests (Playwright)
- User login flow (SSO mock)
- Document upload → search → download
- AI Assistant query with redaction
- Compliance dashboard generation
- PQC Scanner execution

#### Security Tests
- OWASP ZAP automated scan
- Dependency vulnerability scan (npm audit, Snyk)
- Secret scanning (git-secrets, TruffleHog)
- Penetration testing (manual, Year 1)

### 5.2 Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Security scan clean (or documented exceptions)
- [ ] Database migrations tested (up and down)
- [ ] Backup and restore procedures validated
- [ ] Monitoring and alerting configured
- [ ] Incident response runbook created
- [ ] SOC 2 evidence collection automated
- [ ] API documentation published
- [ ] User onboarding guide completed
- [ ] Design partner training scheduled

### 5.3 Launch Criteria

**Design Partner MVP (6-9 months):**
- ✅ Core document management (upload, version, organize)
- ✅ Full-text and semantic search
- ✅ RBAC with SSO/MFA
- ✅ PQC encryption for new documents
- ✅ Basic AI Assistant (no PHI/PII redaction yet)
- ✅ Audit logging
- ✅ SOC 2 evidence collection (partial)
- ✅ PQC Scanner integration (beta)

**General Availability (12-18 months):**
- ✅ All MVP features hardened
- ✅ PHI/PII redaction in production
- ✅ SOC 2 Type II certified
- ✅ Full QBOM reporting
- ✅ 99.9% uptime demonstrated (3 months)
- ✅ Design partner NPS ≥ 60
- ✅ First 50 paying customers

---

## Appendix A: Project Structure

```
stella-core/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   └── api/                 # Next.js API routes (could be same as web)
├── packages/
│   ├── database/           # Prisma schema, migrations
│   ├── auth/               # Auth utilities, SSO integration
│   ├── pqc/                # PQC crypto wrapper (liboqs)
│   ├── ai/                 # AI service abstraction
│   ├── search/             # Search service (FTS + vector)
│   ├── plugins/            # Plugin framework
│   │   ├── pqc-scanner/
│   │   ├── q-cmm/
│   │   └── deep-research/
│   └── shared/             # Shared types, utilities
├── infrastructure/
│   ├── terraform/          # IaC for Azure/AWS
│   ├── docker/             # Dockerfiles
│   └── k8s/                # Kubernetes manifests (Phase 2)
├── docs/
│   ├── api/                # API documentation
│   ├── architecture/       # Architecture diagrams
│   └── guides/             # User and admin guides
├── scripts/
│   ├── seed-data.ts
│   └── migrate.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/
│   └── workflows/          # CI/CD
├── package.json
├── turbo.json             # Turborepo config
└── README.md
```

## Appendix B: Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project setup (monorepo, TypeScript, linting)
- [ ] Database schema and migrations
- [ ] Authentication (SSO, MFA, RBAC)
- [ ] Basic document upload/download
- [ ] Audit logging infrastructure

### Phase 2: Core Features (Weeks 5-12)
- [ ] Workspace management
- [ ] Full-text search
- [ ] Semantic search (pgvector)
- [ ] Document versioning
- [ ] PQC encryption layer
- [ ] Basic UI (Next.js)

### Phase 3: AI & Intelligence (Weeks 13-18)
- [ ] AI Assistant integration
- [ ] PHI/PII redaction
- [ ] Document classification
- [ ] Semantic search refinement
- [ ] Citation extraction

### Phase 4: Compliance & Plugins (Weeks 19-24)
- [ ] Compliance workflow engine
- [ ] QBOM generation
- [ ] PQC Scanner plugin
- [ ] Evidence collection automation
- [ ] DLP controls

### Phase 5: Hardening & Launch Prep (Weeks 25-30)
- [ ] Security hardening
- [ ] Performance optimization
- [ ] SOC 2 preparation
- [ ] Documentation
- [ ] Design partner onboarding
- [ ] Beta testing

---

## Conclusion

This SPARC architecture provides a comprehensive roadmap for building the ArcQubit Knowledge Work Platform. The modular design, clear separation of concerns, and phased approach enable a small team to deliver a production-ready MVP in 6-9 months while maintaining a clear path to scale.

**Key Success Factors:**
1. Start simple (PostgreSQL-centric MVP)
2. Build security and compliance in from day one
3. Modular architecture for easy extension
4. Clear phase gates and success criteria
5. Automated testing and deployment

**Next Steps:**
1. Set up development environment
2. Initialize monorepo structure
3. Create database schema and migrations
4. Implement authentication layer
5. Build document management core
