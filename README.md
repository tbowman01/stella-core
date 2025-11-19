# ArcQubit Knowledge Work Platform (Stella Core)

**Version:** 0.1.0 (MVP Development)
**Status:** In Development

---

## Overview

ArcQubit Knowledge Work Platform is a quantum-ready, AI-powered document management and knowledge work system designed for regulated industries requiring post-quantum cryptographic protection.

### Key Features

- 🔐 **Post-Quantum Cryptography**: NIST-approved PQC algorithms (ML-KEM, ML-DSA) for future-proof security
- 🤖 **AI-Powered Assistant**: Claude/GPT integration with PHI/PII redaction
- 📊 **Compliance Automation**: SOC 2, CMMC, NIST RMF evidence collection
- 🔍 **Hybrid Search**: Full-text + semantic search (pgvector)
- 🏢 **Multi-Tenant**: Secure tenant isolation with RBAC
- 📈 **QBOM Tracking**: Quantum Bill of Materials for crypto asset management
- 🔌 **Plugin Framework**: Extensible architecture (PQC Scanner, Q-CMM, Deep-Research)

---

## Architecture

This project follows the **SPARC methodology** (Specification, Pseudocode, Architecture, Refinement, Completion). See [SPARC.md](./SPARC.md) for detailed architecture documentation.

### Technology Stack

**Frontend:**
- Next.js 14 (React 18, App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Query

**Backend:**
- Next.js API Routes
- PostgreSQL 16 (with pgvector)
- Redis (cache + BullMQ)
- Prisma ORM

**Infrastructure:**
- Azure/AWS (cloud-native)
- Docker + Kubernetes
- Terraform/Pulumi (IaC)

**Security:**
- liboqs (PQC library)
- SSO/SAML/OIDC
- MFA enforcement
- Encryption at rest + in transit

---

## Project Structure

```
stella-core/
├── apps/
│   ├── web/                 # Next.js frontend + API routes
│   └── api/                 # (Optional) Standalone API server
├── packages/
│   ├── database/           # Prisma schema, migrations
│   ├── auth/               # Authentication & authorization
│   ├── pqc/                # Post-quantum cryptography
│   ├── ai/                 # AI service integration
│   ├── search/             # Search engine (FTS + vector)
│   ├── plugins/            # Plugin framework
│   └── shared/             # Shared types & utilities
├── infrastructure/         # IaC, Docker, Kubernetes
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── tests/                  # Test suites
└── .github/workflows/      # CI/CD pipelines
```

---

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL 16+
- Redis 7+
- npm 10+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd stella-core

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

```bash
npm run dev          # Start development servers
npm run build        # Build all packages and apps
npm run test         # Run all tests
npm run test:unit    # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
npm run db:studio    # Open Prisma Studio
```

---

## Development Roadmap

### Phase 1: Foundation (Weeks 1-4) 🚧 In Progress
- [x] Project setup and architecture
- [ ] Database schema and migrations
- [ ] Authentication (SSO, MFA, RBAC)
- [ ] Basic document management
- [ ] Audit logging

### Phase 2: Core Features (Weeks 5-12)
- [ ] Workspace management
- [ ] Full-text + semantic search
- [ ] Document versioning
- [ ] PQC encryption layer
- [ ] Next.js UI

### Phase 3: AI & Intelligence (Weeks 13-18)
- [ ] AI Assistant integration
- [ ] PHI/PII redaction
- [ ] Document classification
- [ ] Citation extraction

### Phase 4: Compliance & Plugins (Weeks 19-24)
- [ ] Compliance workflows
- [ ] QBOM generation
- [ ] PQC Scanner plugin
- [ ] DLP controls

### Phase 5: Hardening (Weeks 25-30)
- [ ] Security hardening
- [ ] Performance optimization
- [ ] SOC 2 preparation
- [ ] Beta testing

---

## Security

This platform implements defense-in-depth security:

1. **Network Layer**: TLS 1.3, hybrid PQC cipher suites
2. **Application Layer**: SSO, MFA, RBAC, CSRF protection
3. **Data Layer**: AES-256-GCM + ML-KEM wrapping, PQC signatures
4. **Egress Layer**: Classification-based policies, watermarking

See [docs/architecture/security.md](./docs/architecture/security.md) for details.

---

## Compliance

Target compliance frameworks:

- SOC 2 Type I (MVP)
- SOC 2 Type II (Year 1)
- CMMC Level 2 (Year 2)
- NIST RMF
- HIPAA (Phase 3+)

---

## Contributing

This is a private, proprietary platform. Contributions are restricted to authorized team members.

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and write tests
3. Run tests: `npm run test`
4. Lint and format: `npm run lint && npm run format`
5. Commit with conventional commits
6. Push and create PR

---

## License

Copyright © 2025 ArcQubit. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Support

For questions or issues, contact:
- **Email**: support@arcqubit.com
- **Documentation**: [docs/](./docs/)
- **Architecture**: [SPARC.md](./SPARC.md)

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Open Quantum Safe](https://openquantumsafe.org/)
- [Anthropic Claude](https://www.anthropic.com/)
