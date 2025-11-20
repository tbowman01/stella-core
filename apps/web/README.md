# ArcQubit Web Application

Next.js 14 frontend for the ArcQubit Knowledge Work Platform.

## Features

- **Authentication**: Login, MFA, SSO support
- **Dashboard**: Activity feed, recent documents, quick actions
- **Document Management**: Upload, search, organize, classify
- **Workspaces**: Hierarchical organization with templates
- **AI Assistant**: RAG-powered chat with PHI/PII redaction
- **Compliance Dashboard**: SOC 2, CMMC, NIST RMF tracking
- **PQC Status**: Post-quantum cryptography migration tracking

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- React Query (data fetching)
- Zustand (state management)
- Lucide React (icons)
- Sonner (toasts)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── login/             # Authentication
│   └── dashboard/         # Main application
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── dashboard/        # Dashboard-specific components
├── lib/                   # Utilities and API client
├── hooks/                 # Custom React hooks
└── store/                 # Zustand stores
```

## Integration with Backend

The frontend integrates with backend packages via the API client (`src/lib/api.ts`):

- **@arcqubit/auth**: Authentication and authorization
- **@arcqubit/documents**: Document management
- **@arcqubit/workspaces**: Workspace organization
- **@arcqubit/search**: Full-text and semantic search
- **@arcqubit/ai**: RAG-powered AI assistant
- **@arcqubit/compliance**: Compliance tracking
- **@arcqubit/pqc**: Post-quantum cryptography

## Security Features

- JWT-based authentication with auto-refresh
- Role-based access control (RBAC)
- Classification-based document access
- PHI/PII redaction in AI responses
- Post-quantum cryptography status tracking

## License

Proprietary - ArcQubit Platform
