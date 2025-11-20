# GitOps Workflow Guide - ArcQubit Platform

Complete guide to the GitOps workflow for deploying and managing the ArcQubit Knowledge Work Platform.

## Table of Contents

1. [Overview](#overview)
2. [GitOps Principles](#gitops-principles)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Initial Setup](#initial-setup)
6. [Development Workflow](#development-workflow)
7. [Deployment Process](#deployment-process)
8. [Monitoring & Observability](#monitoring--observability)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

This project implements a complete GitOps workflow using:

- **Infrastructure as Code**: Terraform for AWS infrastructure
- **Continuous Integration**: GitHub Actions for testing and building
- **Continuous Deployment**: ArgoCD for automatic deployments
- **Configuration Management**: Helm charts for Kubernetes applications
- **Secrets Management**: External Secrets Operator with AWS Secrets Manager

### Benefits

- **Single Source of Truth**: Git is the source of truth for everything
- **Automated Deployments**: Push to Git, deploy automatically
- **Audit Trail**: Every change tracked in Git history
- **Rollback**: Easy rollback using Git revert
- **Security**: Secrets managed centrally, not in Git

## GitOps Principles

Our implementation follows the four principles of GitOps:

1. **Declarative**: System desired state expressed declaratively
2. **Versioned**: Canonical desired state versioned in Git
3. **Pulled**: Approved changes automatically applied to system
4. **Continuously Reconciled**: Software agents ensure correctness

## Architecture

### Complete GitOps Stack

```
┌──────────────────────────────────────────────────────────────┐
│                      Developer Workflow                       │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ git push
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                       GitHub Repository                       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │  Code  │  │  Helm  │  │ArgoCD  │  │Terraform│            │
│  │        │  │Charts  │  │Config  │  │Modules  │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ webhook trigger
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                     GitHub Actions (CI)                       │
│                                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐      │
│  │  Lint   │→ │   Test   │→ │  Build  │→ │  Deploy  │      │
│  │  Code   │  │  (116+)  │  │  Image  │  │ Manifest │      │
│  └─────────┘  └──────────┘  └─────────┘  └──────────┘      │
│                                    │                          │
│                                    ▼                          │
│                            ┌──────────────┐                  │
│                            │Push to GHCR  │                  │
│                            └──────┬───────┘                  │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                                    │ update manifest
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    ArgoCD (CD) - In Cluster                   │
│                                                               │
│  Watches Git  →  Detects Changes  →  Syncs to Kubernetes    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ kubectl apply
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (EKS)                   │
│                                                               │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │  Web   │  │Workers │  │  RDS   │  │ Redis  │            │
│  │  Pods  │  │  Pods  │  │  (PG)  │  │        │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
└──────────────────────────────────────────────────────────────┘
                 │
                 │ fetch secrets
                 ▼
┌──────────────────────────────────────────────────────────────┐
│               AWS Secrets Manager (Secrets)                   │
│                                                               │
│  JWT Secret, DB Password, Redis Password, API Keys...        │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Developer**: Writes code, creates PR
2. **GitHub Actions**: Runs tests, builds image
3. **GHCR**: Stores Docker images
4. **ArgoCD**: Detects manifest changes, syncs to cluster
5. **Kubernetes**: Runs applications
6. **ESO**: Syncs secrets from AWS Secrets Manager

## Prerequisites

### Tools Required

```bash
# Install required tools
brew install terraform
brew install kubectl
brew install helm
brew install argocd
brew install awscli
```

### Access Required

- **GitHub**: Write access to repository
- **AWS**: Admin access to AWS account
- **Kubernetes**: Cluster admin access

## Initial Setup

### Step 1: Provision Infrastructure with Terraform

```bash
# Navigate to Terraform directory
cd terraform

# Initialize Terraform
terraform init

# Plan infrastructure for staging
terraform plan -var-file=environments/staging.tfvars

# Apply infrastructure
terraform apply -var-file=environments/staging.tfvars

# Save outputs
terraform output > ../outputs.txt
```

**What gets created:**
- VPC with public/private/database subnets
- EKS cluster with node groups
- RDS PostgreSQL database
- ElastiCache Redis cluster
- S3 buckets for documents and backups
- IAM roles and policies
- Secrets Manager secrets
- CloudWatch log groups

**Time**: ~20-30 minutes

### Step 2: Configure kubectl

```bash
# Update kubeconfig for staging
aws eks update-kubeconfig \
  --region us-east-1 \
  --name arcqubit-staging

# Verify connection
kubectl get nodes
kubectl get namespaces
```

### Step 3: Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=external-secrets \
  -n external-secrets-system \
  --timeout=300s

# Apply SecretStore
kubectl apply -f kubernetes/external-secrets/secretstore-staging.yaml

# Apply ExternalSecret
kubectl apply -f kubernetes/external-secrets/externalsecret-staging.yaml
```

### Step 4: Install ArgoCD

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=argocd-server \
  -n argocd \
  --timeout=600s

# Get initial admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

echo "ArgoCD Password: $ARGOCD_PASSWORD"

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Login with CLI
argocd login localhost:8080 \
  --username admin \
  --password "$ARGOCD_PASSWORD" \
  --insecure
```

### Step 5: Deploy Application with ArgoCD

```bash
# Apply ArgoCD project
kubectl apply -f argocd/base/project.yaml

# Deploy using App of Apps pattern
kubectl apply -f argocd/app-of-apps.yaml

# Or deploy staging individually
kubectl apply -k argocd/overlays/staging

# Watch deployment
argocd app get arcqubit-staging --watch

# Check application status
kubectl get pods -n arcqubit-staging
```

### Step 6: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n arcqubit-staging

# Check services
kubectl get svc -n arcqubit-staging

# Check ingress
kubectl get ingress -n arcqubit-staging

# Test health endpoint
kubectl run -it --rm curl --image=curlimages/curl --restart=Never -- \
  curl http://arcqubit.arcqubit-staging.svc.cluster.local:3000/api/health

# View application logs
kubectl logs -f deployment/arcqubit -n arcqubit-staging
```

## Development Workflow

### Daily Development

```bash
# 1. Create feature branch
git checkout -b feature/my-new-feature

# 2. Make code changes
vim apps/web/src/...

# 3. Run tests locally
npm test
npm run test:integration

# 4. Commit changes
git add .
git commit -m "feat: add new feature"

# 5. Push to GitHub
git push origin feature/my-new-feature

# 6. Create Pull Request on GitHub
# CI automatically runs tests, builds image

# 7. After PR approval, merge to main
# Staging automatically deploys via ArgoCD
```

### What Happens Automatically

**On PR Creation:**
1. GitHub Actions runs linting
2. Runs unit tests (116 tests)
3. Runs integration tests (50+ tests)
4. Builds Docker image (preview)
5. Runs security scans

**On Merge to Main:**
1. GitHub Actions runs full test suite
2. Builds production Docker image
3. Pushes image to GHCR with tags:
   - `latest`
   - `sha-<git-sha>`
   - `main`
4. Updates ArgoCD manifest with new image tag
5. Commits manifest change to Git

**ArgoCD (Staging):**
1. Detects manifest change in Git
2. Automatically syncs to cluster
3. Performs rolling update
4. Monitors health checks
5. Sends Slack notification

**ArgoCD (Production):**
1. Detects manifest change
2. Waits for manual approval
3. Admin reviews and approves
4. Deploys to production
5. Monitors and reports

## Deployment Process

### Deploying to Staging

**Automatic** - happens on every merge to `main`:

```bash
# Staging deploys automatically
# No action required!

# Monitor deployment
argocd app get arcqubit-staging --watch

# View sync status
kubectl get applications -n argocd

# Check pod rollout
kubectl rollout status deployment/arcqubit -n arcqubit-staging
```

### Deploying to Production

**Manual** - requires approval:

```bash
# 1. Review changes in ArgoCD UI
open https://argocd.yourdomain.com

# 2. Review diff
argocd app diff arcqubit-production

# 3. Sync to production (manual approval required)
argocd app sync arcqubit-production

# 4. Monitor deployment
argocd app get arcqubit-production --watch

# 5. Verify health
kubectl get pods -n arcqubit-production
curl https://arcqubit.com/api/health

# 6. Monitor logs
kubectl logs -f deployment/arcqubit -n arcqubit-production --tail=100
```

### Rollback

```bash
# View deployment history
argocd app history arcqubit-production

# Rollback to previous version
argocd app rollback arcqubit-production

# Or rollback to specific revision
argocd app rollback arcqubit-production 123

# Using kubectl
kubectl rollout undo deployment/arcqubit -n arcqubit-production

# Rollback to specific revision
kubectl rollout undo deployment/arcqubit \
  -n arcqubit-production \
  --to-revision=5
```

## Monitoring & Observability

### Application Monitoring

```bash
# Pod status
kubectl get pods -n arcqubit-production

# Resource usage
kubectl top pods -n arcqubit-production

# Events
kubectl get events -n arcqubit-production --sort-by='.lastTimestamp'

# Logs
kubectl logs -f deployment/arcqubit -n arcqubit-production
```

### ArgoCD Monitoring

```bash
# Application health
argocd app list

# Sync status
argocd app get arcqubit-production

# View sync history
argocd app history arcqubit-production

# Resource tree
kubectl get app arcqubit-production -n argocd -o jsonpath='{.status.resources}'
```

### Infrastructure Monitoring

```bash
# CloudWatch logs
aws logs tail /aws/eks/arcqubit-production --follow

# RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=arcqubit-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Troubleshooting

### CI Pipeline Failures

```bash
# View GitHub Actions logs
gh run list
gh run view <run-id>

# Re-run failed job
gh run rerun <run-id>

# Common issues:
# - Test failures: Fix tests and push
# - Build failures: Check Dockerfile
# - Lint errors: Run npm run lint --fix
```

### ArgoCD Sync Failures

```bash
# Check application status
argocd app get arcqubit-staging

# View sync errors
kubectl describe application arcqubit-staging -n argocd

# Force refresh
argocd app get arcqubit-staging --refresh --hard-refresh

# Force sync
argocd app sync arcqubit-staging --force

# Prune resources
argocd app sync arcqubit-staging --prune
```

### Pod Failures

```bash
# Describe pod
kubectl describe pod <pod-name> -n arcqubit-staging

# View logs
kubectl logs <pod-name> -n arcqubit-staging

# View previous container logs (if pod crashed)
kubectl logs <pod-name> -n arcqubit-staging --previous

# Check events
kubectl get events -n arcqubit-staging --field-selector involvedObject.name=<pod-name>

# Debug with shell
kubectl exec -it <pod-name> -n arcqubit-staging -- /bin/sh
```

### Secret Sync Issues

```bash
# Check ExternalSecret status
kubectl get externalsecret -n arcqubit-staging
kubectl describe externalsecret arcqubit-secrets -n arcqubit-staging

# Check SecretStore
kubectl get secretstore -n arcqubit-staging

# View ESO logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets

# Force refresh secret
kubectl annotate externalsecret arcqubit-secrets \
  force-sync=$(date +%s) \
  -n arcqubit-staging \
  --overwrite
```

## Best Practices

### 1. Branch Strategy

```
main (protected)
  ├── feature/add-user-auth
  ├── feature/improve-search
  └── hotfix/critical-bug

# Feature branches for new features
# Hotfix branches for production bugs
# Always merge via Pull Request
```

### 2. Commit Messages

Follow conventional commits:

```bash
feat: add user authentication
fix: resolve database connection timeout
docs: update deployment guide
chore: upgrade dependencies
test: add integration tests for search
```

### 3. Testing Strategy

```bash
# Before pushing
npm run lint
npm run typecheck
npm test
npm run test:integration

# CI will also run
npm run test:coverage
npm run test:e2e
```

### 4. Deployment Schedule

- **Staging**: Deploy anytime (automatic)
- **Production**: Mon-Fri, 9am-5pm (manual approval)
- **Hotfixes**: Anytime with approval

### 5. Rollback Strategy

- Monitor deployments for 30 minutes
- Rollback immediately if errors spike
- Use ArgoCD or kubectl rollout undo
- Document rollback reason

### 6. Secret Rotation

- Rotate secrets every 90 days
- Test in staging first
- Monitor for connection errors
- Update documentation

### 7. Cost Optimization

- Scale down staging at night
- Use spot instances for workers
- Enable autoscaling
- Monitor unused resources

## Cheat Sheet

### Common Commands

```bash
# Deploy to staging
git push origin main

# Deploy to production
argocd app sync arcqubit-production

# Rollback
argocd app rollback arcqubit-production

# View logs
kubectl logs -f deployment/arcqubit -n arcqubit-production

# Scale replicas
kubectl scale deployment arcqubit --replicas=10 -n arcqubit-production

# Update secret
aws secretsmanager update-secret \
  --secret-id arcqubit/production/jwt-secret \
  --secret-string "new-value"

# Restart pods
kubectl rollout restart deployment/arcqubit -n arcqubit-production

# View metrics
kubectl top pods -n arcqubit-production
```

## Support

- **Documentation**: https://docs.arcqubit.com
- **GitHub Issues**: https://github.com/your-org/stella-core/issues
- **Slack**: #arcqubit-deployments, #arcqubit-alerts

## License

MIT License - See LICENSE file for details
