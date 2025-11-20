# ArcQubit Platform Helm Chart

Enterprise-grade Helm chart for deploying the ArcQubit Knowledge Work Platform with Post-Quantum Cryptography on Kubernetes.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure
- Ingress controller (e.g., nginx-ingress)
- cert-manager (for TLS certificates)
- External Secrets Operator (for secrets management)

## Quick Start

### Add Helm Repository

```bash
# Add the repository (if published)
helm repo add arcqubit https://charts.arcqubit.com
helm repo update

# Or install from local directory
cd helm/arcqubit
```

### Install Chart

```bash
# Install with default values
helm install arcqubit . -n arcqubit --create-namespace

# Install staging environment
helm install arcqubit . -n arcqubit-staging \
  --create-namespace \
  --values values-staging.yaml

# Install production environment
helm install arcqubit . -n arcqubit-production \
  --create-namespace \
  --values values-production.yaml
```

### Upgrade Chart

```bash
# Upgrade staging
helm upgrade arcqubit . -n arcqubit-staging \
  --values values-staging.yaml

# Upgrade production with custom values
helm upgrade arcqubit . -n arcqubit-production \
  --values values-production.yaml \
  --set image.tag=v1.2.3
```

### Uninstall Chart

```bash
helm uninstall arcqubit -n arcqubit-staging
```

## Configuration

### Required Configuration

Before installing, you must configure:

1. **Secrets Management**: Set up External Secrets Operator or manually create secrets
2. **Ingress Host**: Configure your domain in `values.yaml`
3. **Storage**: Configure S3 bucket or compatible object storage

### External Secrets Operator Setup

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore (AWS example)
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager-production
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
EOF
```

### Manual Secrets (if not using External Secrets)

```bash
# Create secrets manually
kubectl create secret generic arcqubit-secrets -n arcqubit-production \
  --from-literal=JWT_SECRET='your-256-bit-secret-here' \
  --from-literal=DATABASE_PASSWORD='your-db-password' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  --from-literal=S3_ACCESS_KEY='your-s3-access-key' \
  --from-literal=S3_SECRET_KEY='your-s3-secret-key' \
  --from-literal=SENTRY_DSN='your-sentry-dsn'
```

### Custom Values

Create a `custom-values.yaml` file:

```yaml
image:
  tag: "v1.0.0"

ingress:
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix

storage:
  bucket: your-s3-bucket
  region: us-west-2

resources:
  limits:
    cpu: 4000m
    memory: 8Gi
  requests:
    cpu: 1000m
    memory: 2Gi
```

Install with custom values:

```bash
helm install arcqubit . -f custom-values.yaml
```

## Configuration Parameters

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageRegistry` | Global Docker image registry | `ghcr.io` |
| `global.imagePullSecrets` | Global Docker registry secrets | `[]` |
| `global.storageClass` | Global storage class | `""` |

### Image Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.registry` | Image registry | `ghcr.io` |
| `image.repository` | Image repository | `your-org/stella-core` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Application Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of web replicas | `3` |
| `env.NODE_ENV` | Node environment | `production` |
| `env.LOG_LEVEL` | Logging level | `info` |
| `env.PORT` | Application port | `3000` |

### Feature Flags

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.features.enablePlugins` | Enable plugin system | `true` |
| `config.features.enableAIAssistant` | Enable AI assistant | `true` |
| `config.features.enablePQC` | Enable post-quantum crypto | `true` |
| `config.features.enableSSO` | Enable single sign-on | `true` |
| `config.features.enableMFA` | Enable multi-factor auth | `true` |

### Resource Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `2000m` |
| `resources.limits.memory` | Memory limit | `4Gi` |
| `resources.requests.cpu` | CPU request | `500m` |
| `resources.requests.memory` | Memory request | `1Gi` |

### Autoscaling Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Minimum replicas | `3` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU % | `70` |
| `autoscaling.targetMemoryUtilizationPercentage` | Target memory % | `80` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.hosts[0].host` | Hostname | `arcqubit.example.com` |
| `ingress.tls` | TLS configuration | See `values.yaml` |

### PostgreSQL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL | `true` |
| `postgresql.auth.database` | Database name | `arcqubit_production` |
| `postgresql.primary.persistence.size` | Storage size | `100Gi` |
| `postgresql.primary.resources.limits.cpu` | CPU limit | `4000m` |
| `postgresql.primary.resources.limits.memory` | Memory limit | `8Gi` |

### Redis Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis | `true` |
| `redis.architecture` | Architecture type | `standalone` |
| `redis.master.persistence.size` | Storage size | `10Gi` |
| `redis.replica.replicaCount` | Number of replicas | `2` |

### Worker Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `worker.enabled` | Enable workers | `true` |
| `worker.replicaCount` | Number of workers | `5` |
| `worker.concurrency` | Jobs per worker | `10` |
| `worker.queues` | Queue names | See `values.yaml` |

### Storage Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `storage.provider` | Storage provider | `s3` |
| `storage.bucket` | S3 bucket name | `arcqubit-documents` |
| `storage.region` | AWS region | `us-east-1` |
| `storage.endpoint` | S3 endpoint URL | `""` |

### Monitoring Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Enable monitoring | `true` |
| `monitoring.sentry.enabled` | Enable Sentry | `true` |
| `monitoring.sentry.environment` | Sentry environment | `production` |
| `monitoring.prometheus.enabled` | Enable Prometheus | `true` |
| `monitoring.datadog.enabled` | Enable DataDog | `false` |

## Architecture

### Components

The Helm chart deploys the following components:

```
┌─────────────────────────────────────────────────────────┐
│                      Ingress (NGINX)                    │
│                  (TLS, Rate Limiting)                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│   Web Pods      │            │  Worker Pods    │
│   (3-20 HPA)    │            │  (5-50 HPA)     │
└────────┬────────┘            └────────┬────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼────┐  ┌───────▼──────┐  ┌────▼─────┐
│ PostgreSQL  │  │    Redis     │  │  MinIO/  │
│  (pgvector) │  │   Cluster    │  │   S3     │
└─────────────┘  └──────────────┘  └──────────┘
```

### High Availability

- **Web Pods**: 3-20 replicas with HPA based on CPU/memory
- **Worker Pods**: 5-50 replicas with HPA based on queue depth
- **PostgreSQL**: Primary-replica setup with automated failover
- **Redis**: Sentinel-based replication for HA
- **Pod Disruption Budgets**: Ensures minimum availability during updates

### Security

- **Network Policies**: Restrict traffic between pods
- **Security Context**: Non-root containers, read-only filesystem
- **Secrets Management**: External Secrets Operator integration
- **TLS**: Automatic certificate management with cert-manager
- **Rate Limiting**: Nginx-based rate limiting

## Operations

### Scaling

```bash
# Scale web replicas manually
kubectl scale deployment arcqubit -n arcqubit-production --replicas=10

# Scale workers manually
kubectl scale deployment arcqubit-worker -n arcqubit-production --replicas=20

# Update HPA settings
helm upgrade arcqubit . -n arcqubit-production \
  --set autoscaling.minReplicas=5 \
  --set autoscaling.maxReplicas=30
```

### Monitoring

```bash
# Check pod status
kubectl get pods -n arcqubit-production

# Check HPA status
kubectl get hpa -n arcqubit-production

# View logs
kubectl logs -f deployment/arcqubit -n arcqubit-production

# View worker logs
kubectl logs -f deployment/arcqubit-worker -n arcqubit-production
```

### Database Operations

```bash
# Run migrations manually
kubectl exec -it deployment/arcqubit -n arcqubit-production -- \
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Connect to PostgreSQL
kubectl exec -it arcqubit-postgresql-0 -n arcqubit-production -- \
  psql -U arcqubit -d arcqubit_production

# Backup database
kubectl exec arcqubit-postgresql-0 -n arcqubit-production -- \
  pg_dump -U arcqubit arcqubit_production > backup.sql
```

### Troubleshooting

```bash
# Describe pod issues
kubectl describe pod <pod-name> -n arcqubit-production

# Check events
kubectl get events -n arcqubit-production --sort-by='.lastTimestamp'

# Check ingress
kubectl describe ingress arcqubit -n arcqubit-production

# Test connectivity
kubectl run -it --rm debug --image=alpine --restart=Never -n arcqubit-production -- sh
```

## Upgrading

### Version Upgrades

1. **Check Changelog**: Review breaking changes
2. **Backup Database**: Always backup before upgrading
3. **Test in Staging**: Upgrade staging first
4. **Rolling Update**: Use Helm upgrade with `--wait` flag

```bash
# Backup database
kubectl exec arcqubit-postgresql-0 -n arcqubit-production -- \
  pg_dump -U arcqubit arcqubit_production > backup-$(date +%Y%m%d).sql

# Upgrade with new version
helm upgrade arcqubit . -n arcqubit-production \
  --values values-production.yaml \
  --set image.tag=v2.0.0 \
  --wait \
  --timeout 10m

# Rollback if needed
helm rollback arcqubit -n arcqubit-production
```

## Best Practices

### Production Deployment

1. **Use specific image tags**: Avoid `latest` in production
2. **Enable monitoring**: Sentry, Prometheus, DataDog
3. **Configure backups**: Regular database and volume backups
4. **Set resource limits**: Prevent resource exhaustion
5. **Enable network policies**: Restrict pod-to-pod communication
6. **Use External Secrets**: Don't store secrets in Git
7. **Enable PDB**: Maintain availability during updates
8. **Multi-zone deployment**: Use pod anti-affinity

### Security Checklist

- [ ] External Secrets Operator configured
- [ ] TLS certificates issued and auto-renewed
- [ ] Network policies enabled
- [ ] RBAC properly configured
- [ ] Security contexts enforced
- [ ] Image scanning enabled
- [ ] Audit logging enabled
- [ ] Rate limiting configured

## Support

- **Documentation**: https://docs.arcqubit.com
- **Issues**: https://github.com/your-org/stella-core/issues
- **Slack**: https://arcqubit.slack.com

## License

MIT License - See LICENSE file for details
