# External Secrets Operator Configuration

This directory contains configuration for the External Secrets Operator (ESO), which synchronizes secrets from AWS Secrets Manager to Kubernetes.

## Overview

External Secrets Operator allows you to:
- Store secrets centrally in AWS Secrets Manager
- Automatically sync secrets to Kubernetes
- Rotate secrets without downtime
- Audit secret access
- Comply with security requirements

## Architecture

```
┌──────────────────────┐
│  AWS Secrets Manager │
│                      │
│  ┌────────────────┐  │
│  │  jwt-secret    │  │
│  │  db-password   │  │
│  │  redis-password│  │
│  │  s3-keys       │  │
│  └────────────────┘  │
└──────────┬───────────┘
           │
           │ IAM Role (IRSA)
           │
┌──────────▼───────────┐
│ External Secrets     │
│ Operator             │
│ (Kubernetes)         │
└──────────┬───────────┘
           │
           │ Watches & Syncs
           │
┌──────────▼───────────┐
│ Kubernetes Secrets   │
│                      │
│  ┌────────────────┐  │
│  │ arcqubit-      │  │
│  │ secrets        │  │
│  └────────────────┘  │
└──────────────────────┘
```

## Prerequisites

1. **AWS Secrets Manager**: Secrets created (via Terraform)
2. **IAM Role**: IRSA role with Secrets Manager read permissions
3. **External Secrets Operator**: Installed in cluster

## Installation

### Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

### Configure SecretStore

```bash
# Apply SecretStore for staging
kubectl apply -f secretstore-staging.yaml

# Apply SecretStore for production
kubectl apply -f secretstore-production.yaml
```

### Create ExternalSecrets

```bash
# Staging
kubectl apply -f externalsecret-staging.yaml -n arcqubit-staging

# Production
kubectl apply -f externalsecret-production.yaml -n arcqubit-production
```

## Configuration Files

### SecretStore

Connects ESO to AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: arcqubit-production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: arcqubit
```

### ExternalSecret

Defines which secrets to sync:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: arcqubit-secrets
  namespace: arcqubit-production
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  refreshInterval: 1h

  target:
    name: arcqubit-secrets
    creationPolicy: Owner

  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: arcqubit/production/jwt-secret

    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: arcqubit/production/database-password
```

## Secret Management

### Creating Secrets in AWS

```bash
# Create JWT secret
aws secretsmanager create-secret \
  --name arcqubit/production/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --description "JWT signing secret for production" \
  --region us-east-1

# Create database password
aws secretsmanager create-secret \
  --name arcqubit/production/database-password \
  --secret-string "$(openssl rand -base64 32)" \
  --description "PostgreSQL password for production" \
  --region us-east-1
```

### Updating Secrets

```bash
# Update secret value
aws secretsmanager update-secret \
  --secret-id arcqubit/production/jwt-secret \
  --secret-string "new-secret-value" \
  --region us-east-1

# Kubernetes secret will auto-update within refreshInterval (1 hour)
# Or force refresh:
kubectl annotate externalsecret arcqubit-secrets \
  force-sync=$(date +%s) \
  -n arcqubit-production
```

### Rotating Secrets

```bash
# Enable automatic rotation (30 days)
aws secretsmanager rotate-secret \
  --secret-id arcqubit/production/database-password \
  --rotation-lambda-arn <lambda-arn> \
  --rotation-rules AutomaticallyAfterDays=30 \
  --region us-east-1
```

## Monitoring

### Check Operator Status

```bash
# Check operator pods
kubectl get pods -n external-secrets-system

# Check operator logs
kubectl logs -n external-secrets-system \
  deployment/external-secrets
```

### Check SecretStore Status

```bash
# Get SecretStore
kubectl get secretstore -n arcqubit-production

# Describe SecretStore
kubectl describe secretstore aws-secrets-manager \
  -n arcqubit-production
```

### Check ExternalSecret Status

```bash
# Get ExternalSecrets
kubectl get externalsecrets -n arcqubit-production

# Describe ExternalSecret
kubectl describe externalsecret arcqubit-secrets \
  -n arcqubit-production

# Check sync status
kubectl get externalsecret arcqubit-secrets \
  -n arcqubit-production \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

### Check Generated Kubernetes Secrets

```bash
# List secrets
kubectl get secrets -n arcqubit-production

# View secret (base64 encoded)
kubectl get secret arcqubit-secrets \
  -n arcqubit-production \
  -o yaml

# Decode secret value
kubectl get secret arcqubit-secrets \
  -n arcqubit-production \
  -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

## Troubleshooting

### ExternalSecret Not Syncing

```bash
# Check ExternalSecret events
kubectl describe externalsecret arcqubit-secrets -n arcqubit-production

# Check operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  --tail=100

# Common issues:
# 1. IAM permissions missing
# 2. Secret doesn't exist in AWS
# 3. Wrong secret path
# 4. SecretStore misconfigured
```

### IAM Permission Issues

```bash
# Verify service account has IAM role
kubectl get sa arcqubit -n arcqubit-production -o yaml

# Check role annotation
# Should have: eks.amazonaws.com/role-arn: arn:aws:iam::...

# Test IAM permissions from pod
kubectl run -it --rm aws-cli \
  --image=amazon/aws-cli \
  --serviceaccount=arcqubit \
  -n arcqubit-production \
  -- secretsmanager list-secrets --region us-east-1
```

### Secret Not Updating

```bash
# Force refresh
kubectl annotate externalsecret arcqubit-secrets \
  force-sync=$(date +%s) \
  -n arcqubit-production \
  --overwrite

# Check refresh interval
kubectl get externalsecret arcqubit-secrets \
  -n arcqubit-production \
  -o jsonpath='{.spec.refreshInterval}'

# Restart pods to pick up new secrets
kubectl rollout restart deployment arcqubit \
  -n arcqubit-production
```

## Security Best Practices

### 1. Least Privilege IAM

Only grant access to specific secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:*:secret:arcqubit/production/*"
      ]
    }
  ]
}
```

### 2. Namespace Isolation

Use separate SecretStores per namespace:

```bash
# Each namespace has its own SecretStore
kubectl get secretstore -A
```

### 3. Audit Logging

Enable CloudTrail for Secrets Manager:

```bash
# View who accessed secrets
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::SecretsManager::Secret \
  --max-results 50
```

### 4. Encryption

- Enable encryption at rest in Secrets Manager
- Use KMS keys for encryption
- Rotate KMS keys regularly

### 5. Secret Rotation

Enable automatic rotation for critical secrets:

```bash
# Database passwords: rotate every 30 days
# API keys: rotate every 90 days
# JWT secrets: rotate every 180 days
```

## Integration with Helm

The Helm chart is already configured to use External Secrets:

```yaml
# helm/arcqubit/values.yaml
externalSecrets:
  enabled: true
  secretStore:
    name: aws-secrets-manager
    kind: SecretStore
```

When deploying with Helm, the ExternalSecret is automatically created.

## Migration from Manual Secrets

If you have existing Kubernetes secrets:

```bash
# 1. Export existing secret
kubectl get secret arcqubit-secrets \
  -n arcqubit-production \
  -o json > backup-secrets.json

# 2. Create secrets in AWS Secrets Manager
# (Use values from backup-secrets.json)

# 3. Apply ExternalSecret
kubectl apply -f externalsecret-production.yaml

# 4. Delete old secret (after verifying)
kubectl delete secret arcqubit-secrets \
  -n arcqubit-production
```

## Cost Considerations

**AWS Secrets Manager Pricing**:
- $0.40 per secret per month
- $0.05 per 10,000 API calls

**Example Costs**:
- 10 secrets × $0.40 = $4/month
- 100K API calls × $0.05/10K = $0.50/month
- **Total**: ~$5/month

## Support

- **ESO Documentation**: https://external-secrets.io
- **AWS Secrets Manager**: https://docs.aws.amazon.com/secretsmanager
- **GitHub Issues**: https://github.com/your-org/stella-core/issues

## License

MIT License - See LICENSE file for details
