# ArgoCD Configuration for ArcQubit Platform

GitOps continuous deployment configuration using ArgoCD for the ArcQubit Knowledge Work Platform.

## Overview

This directory contains ArgoCD manifests for deploying the ArcQubit platform across multiple environments using the GitOps methodology. All deployments are automatically synchronized from Git.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│                  (Source of Truth for GitOps)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Git Sync
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      ArgoCD Server                           │
│         (Monitors Git, Syncs to Kubernetes)                  │
└─────────────┬──────────────────────┬────────────────────────┘
              │                      │
              │ Deploy               │ Deploy
              │                      │
┌─────────────▼──────────┐  ┌────────▼──────────────┐
│   Staging Namespace    │  │  Production Namespace  │
│ (arcqubit-staging)     │  │ (arcqubit-production)  │
│                        │  │                        │
│ - Auto-sync: ON        │  │ - Auto-sync: OFF       │
│ - Self-heal: ON        │  │ - Self-heal: OFF       │
│ - Branch: main         │  │ - Branch: main         │
└────────────────────────┘  └───────────────────────┘
```

## Prerequisites

### Install ArgoCD

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access at https://localhost:8080
# Username: admin
# Password: (from above command)
```

### Install ArgoCD CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# Login
argocd login localhost:8080
```

## Quick Start

### Option 1: App of Apps Pattern (Recommended)

Deploy both staging and production with a single command:

```bash
# Apply the project first
kubectl apply -f argocd/base/project.yaml

# Apply the App of Apps
kubectl apply -f argocd/app-of-apps.yaml
```

This will automatically create and manage both `arcqubit-staging` and `arcqubit-production` applications.

### Option 2: Individual Applications

Deploy environments individually:

```bash
# Deploy staging
kubectl apply -k argocd/overlays/staging

# Deploy production
kubectl apply -k argocd/overlays/production
```

## Configuration Files

### Directory Structure

```
argocd/
├── README.md                           # This file
├── app-of-apps.yaml                    # App of Apps + ApplicationSet
├── base/
│   ├── application.yaml                # Base Application template
│   └── project.yaml                    # AppProject definition
└── overlays/
    ├── staging/
    │   └── kustomization.yaml          # Staging overrides
    └── production/
        └── kustomization.yaml          # Production overrides
```

### Key Files

**`base/project.yaml`**
- Defines the `arcqubit-platform` AppProject
- Sets permissions and RBAC policies
- Configures sync windows
- Defines allowed repositories and destinations

**`base/application.yaml`**
- Base Application template
- Helm chart configuration
- Sync policies
- Health checks

**`overlays/staging/kustomization.yaml`**
- Staging-specific overrides
- Auto-sync enabled
- Self-heal enabled
- Image tag: `staging`

**`overlays/production/kustomization.yaml`**
- Production-specific overrides
- Auto-sync disabled (manual approval)
- Self-heal disabled
- Image tag: `latest`

**`app-of-apps.yaml`**
- Parent application managing child applications
- ApplicationSet for multi-environment deployment
- Single source of truth for all environments

## GitOps Workflow

### Deployment Flow

1. **Code Changes**: Developer pushes code to GitHub
2. **CI Pipeline**: GitHub Actions builds and tests
3. **Image Build**: Docker image built and pushed to GHCR
4. **Manifest Update**: CI updates image tag in ArgoCD manifests
5. **Git Commit**: Manifest changes committed to Git
6. **ArgoCD Sync**: ArgoCD detects changes and syncs to cluster
7. **Deployment**: Kubernetes applies the changes
8. **Health Check**: ArgoCD monitors application health

### Staging Deployment (Automatic)

```bash
# 1. CI pipeline completes successfully
# 2. Image pushed with 'staging' tag
# 3. ArgoCD detects change in Git
# 4. Automatically syncs to staging namespace
# 5. Self-heals if configuration drifts
```

### Production Deployment (Manual)

```bash
# 1. CI pipeline completes on main branch
# 2. Image pushed with 'latest' tag
# 3. ArgoCD detects change but waits for approval
# 4. Admin reviews and approves sync
argocd app sync arcqubit-production

# 5. ArgoCD deploys to production
# 6. Monitors health and reports status
```

## Operations

### Viewing Applications

```bash
# List all applications
argocd app list

# Get application details
argocd app get arcqubit-staging
argocd app get arcqubit-production

# View application status
argocd app get arcqubit-staging --refresh

# View sync history
argocd app history arcqubit-staging
```

### Syncing Applications

```bash
# Sync staging (manual trigger)
argocd app sync arcqubit-staging

# Sync production with confirmation
argocd app sync arcqubit-production

# Sync specific resources
argocd app sync arcqubit-staging --resource deployment:arcqubit

# Dry run
argocd app sync arcqubit-staging --dry-run

# Force sync (ignore differences)
argocd app sync arcqubit-staging --force
```

### Rollback

```bash
# View history
argocd app history arcqubit-production

# Rollback to specific revision
argocd app rollback arcqubit-production 123

# Rollback to previous version
argocd app rollback arcqubit-production
```

### Comparing Differences

```bash
# Show diff between Git and cluster
argocd app diff arcqubit-staging

# Show diff for specific resources
argocd app diff arcqubit-staging --resource deployment:arcqubit
```

### Application Health

```bash
# Get health status
argocd app get arcqubit-staging --output json | jq '.status.health'

# Wait for healthy status
argocd app wait arcqubit-staging --health

# Get sync status
argocd app get arcqubit-staging --output json | jq '.status.sync'
```

## Environment Configuration

### Staging Environment

- **Namespace**: `arcqubit-staging`
- **Auto-sync**: Enabled
- **Self-heal**: Enabled
- **Image Tag**: `staging`
- **Branch**: `main`
- **Domain**: `staging.arcqubit.example.com`
- **Replicas**: 2 web, 2 workers

**Characteristics:**
- Automatically deploys when code is merged to `main`
- Self-heals configuration drift
- Suitable for testing and validation
- Lower resource allocation

### Production Environment

- **Namespace**: `arcqubit-production`
- **Auto-sync**: Disabled (manual approval required)
- **Self-heal**: Disabled
- **Image Tag**: `latest`
- **Branch**: `main`
- **Domain**: `arcqubit.example.com`
- **Replicas**: 5 web, 10 workers

**Characteristics:**
- Requires manual sync approval
- No automatic self-healing
- Production-grade resources
- Sync windows: Mon-Fri 9am-5pm

## RBAC and Permissions

### Project Roles

**`readonly`**
- View applications
- View sync status
- Cannot trigger syncs

**`deployer`**
- View applications
- Trigger syncs
- Update parameters
- Used by CI/CD pipelines

**`admin`**
- Full control
- Create/delete applications
- Modify project settings

### Assigning Roles

```bash
# Add user to readonly role
argocd proj role add-group arcqubit-platform readonly developers

# Add service account to deployer role
argocd proj role add-policy arcqubit-platform deployer \
  -p "p, proj:arcqubit-platform:deployer, applications, sync, arcqubit-platform/*, allow"
```

## Notifications

ArgoCD can send notifications to Slack on various events:

### Configured Notifications

- **Sync Succeeded**: Posted to `#arcqubit-deployments`
- **Sync Failed**: Posted to `#arcqubit-alerts`
- **Health Degraded**: Posted to `#arcqubit-alerts`

### Configure Slack Integration

```bash
# Create secret with Slack token
kubectl create secret generic argocd-notifications-secret -n argocd \
  --from-literal=slack-token="xoxb-your-token-here"

# Apply notification configuration
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: \$slack-token
  template.app-sync-succeeded: |
    message: |
      Application {{.app.metadata.name}} sync succeeded.
      Environment: {{.app.metadata.labels.environment}}
      URL: {{.app.status.operationState.operation.sync.revision}}
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-sync-succeeded]
EOF
```

## Sync Waves

Resources are deployed in waves to ensure proper ordering:

- **Wave 0**: Namespaces, ConfigMaps, Secrets
- **Wave 1**: Databases (PostgreSQL, Redis)
- **Wave 2**: Application Deployments
- **Wave 3**: Services, Ingress

Control wave with annotation:
```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

## Health Checks

ArgoCD monitors these health checks:

- **Deployments**: All replicas ready
- **StatefulSets**: All replicas ready
- **Services**: Endpoints available
- **Ingress**: Certificate issued
- **Custom Health Checks**: Application health endpoint

## Troubleshooting

### Application Stuck in Progressing

```bash
# Check events
kubectl get events -n arcqubit-staging --sort-by='.lastTimestamp'

# Check pod status
kubectl get pods -n arcqubit-staging

# View application logs
kubectl logs -n arcqubit-staging deployment/arcqubit -f

# Force refresh
argocd app get arcqubit-staging --refresh --hard-refresh
```

### Sync Failed

```bash
# View sync errors
argocd app get arcqubit-staging

# Show detailed error
kubectl describe application arcqubit-staging -n argocd

# View last operation
argocd app get arcqubit-staging --output json | jq '.status.operationState'
```

### Out of Sync

```bash
# Show differences
argocd app diff arcqubit-staging

# Ignore differences for specific fields
# Edit application and add to ignoreDifferences:
kubectl edit application arcqubit-staging -n argocd
```

### Application Won't Delete

```bash
# Remove finalizer
kubectl patch app arcqubit-staging -n argocd \
  -p '{"metadata":{"finalizers":null}}' --type merge

# Force delete
kubectl delete app arcqubit-staging -n argocd --force --grace-period=0
```

## Best Practices

### 1. Staging-First Deployment

Always deploy to staging first:
```bash
# Deploy to staging
git push origin main

# Validate staging
curl https://staging.arcqubit.example.com/api/health

# Promote to production
argocd app sync arcqubit-production
```

### 2. Use Sync Windows

Production deployments only during business hours.

### 3. Manual Approval for Production

Never enable auto-sync for production.

### 4. Monitor Application Health

Set up Slack notifications for all environments.

### 5. Use ApplicationSets

Manage multiple environments efficiently.

### 6. Version Control Everything

All configuration changes through Git.

### 7. Test Manifest Changes

Use `argocd app diff` before syncing.

### 8. Regular Audits

Review sync history and drift regularly.

## Security Considerations

- **RBAC**: Implement least privilege access
- **Secrets**: Use External Secrets Operator
- **Network Policies**: Restrict pod-to-pod communication
- **Image Scanning**: Scan before deployment
- **Admission Controllers**: Validate manifests
- **Audit Logs**: Monitor all changes

## Integration with CI/CD

### GitHub Actions Integration

The CI pipeline automatically updates ArgoCD manifests:

```yaml
# .github/workflows/ci.yml
- name: Update ArgoCD manifests
  run: |
    IMAGE_TAG="sha-${{ github.sha }}"
    sed -i "s|image:.*|image: ghcr.io/org/repo:$IMAGE_TAG|g" \
      argocd/overlays/staging/kustomization.yaml
    git commit -m "Update staging image to $IMAGE_TAG"
    git push
```

ArgoCD detects the change and syncs automatically.

## Support

- **ArgoCD Docs**: https://argo-cd.readthedocs.io
- **GitHub Issues**: https://github.com/your-org/stella-core/issues
- **Slack**: #arcqubit-deployments

## License

MIT License - See LICENSE file for details
