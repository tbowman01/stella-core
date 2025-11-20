# ArcQubit Platform - Terraform Infrastructure

Infrastructure as Code (IaC) for the ArcQubit Knowledge Work Platform using Terraform.

## Overview

This Terraform configuration provisions a complete, production-ready infrastructure for the ArcQubit platform on AWS, including:

- **Networking**: VPC with public, private, and database subnets across 3 availability zones
- **Kubernetes**: Amazon EKS cluster with multiple node groups
- **Database**: Amazon RDS PostgreSQL with pgvector extension
- **Cache**: Amazon ElastiCache Redis cluster
- **Storage**: Amazon S3 buckets for documents, backups, and logs
- **Security**: AWS Secrets Manager, IAM roles, security groups
- **Monitoring**: CloudWatch logs, metrics, and alarms
- **DNS**: Route53 hosted zones and records

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    VPC (10.0.0.0/16)                     │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   Public    │  │   Public    │  │   Public    │     │  │
│  │  │  Subnet 1   │  │  Subnet 2   │  │  Subnet 3   │     │  │
│  │  │  (NAT GW)   │  │  (NAT GW)   │  │  (NAT GW)   │     │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │  │
│  │         │                │                │            │  │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐     │  │
│  │  │   Private   │  │   Private   │  │   Private   │     │  │
│  │  │  Subnet 1   │  │  Subnet 2   │  │  Subnet 3   │     │  │
│  │  │   (EKS)     │  │   (EKS)     │  │   (EKS)     │     │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │  │
│  │         │                │                │            │  │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐     │  │
│  │  │  Database   │  │  Database   │  │  Database   │     │  │
│  │  │  Subnet 1   │  │  Subnet 2   │  │  Subnet 3   │     │  │
│  │  │ (RDS/Redis) │  │ (RDS/Redis) │  │ (RDS/Redis) │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     RDS      │  │ ElastiCache  │  │      S3      │         │
│  │  PostgreSQL  │  │    Redis     │  │   Buckets    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Secrets    │  │  CloudWatch  │  │   Route53    │         │
│  │   Manager    │  │   Logs       │  │     DNS      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

- **Terraform**: 1.5.0 or higher
- **AWS CLI**: 2.x configured with credentials
- **kubectl**: For Kubernetes management
- **helm**: For installing Kubernetes applications

### AWS Permissions

The AWS user/role needs permissions for:
- VPC, EC2, EKS
- RDS, ElastiCache
- S3, IAM
- Secrets Manager
- CloudWatch
- Route53

### Initial Setup

1. **Create S3 bucket for Terraform state**:
```bash
aws s3 mb s3://arcqubit-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket arcqubit-terraform-state \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket arcqubit-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

2. **Create DynamoDB table for state locking**:
```bash
aws dynamodb create-table \
  --table-name arcqubit-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

## Quick Start

### Deploy Staging Environment

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan -var-file=environments/staging.tfvars

# Apply the configuration
terraform apply -var-file=environments/staging.tfvars

# Configure kubectl
aws eks update-kubeconfig \
  --region us-east-1 \
  --name arcqubit-staging
```

### Deploy Production Environment

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan -var-file=environments/production.tfvars

# Apply the configuration (requires approval)
terraform apply -var-file=environments/production.tfvars

# Configure kubectl
aws eks update-kubeconfig \
  --region us-east-1 \
  --name arcqubit-production
```

## Module Structure

```
terraform/
├── main.tf                      # Root module orchestration
├── variables.tf                 # Variable definitions
├── outputs.tf                   # Output values
├── versions.tf                  # Provider versions
├── environments/
│   ├── staging.tfvars          # Staging configuration
│   └── production.tfvars       # Production configuration
└── modules/
    ├── vpc/                    # VPC and networking
    ├── eks/                    # EKS cluster
    ├── rds/                    # RDS PostgreSQL
    ├── redis/                  # ElastiCache Redis
    ├── s3/                     # S3 buckets
    ├── irsa/                   # IAM Roles for Service Accounts
    ├── secrets_manager/        # AWS Secrets Manager
    ├── cloudwatch/             # Monitoring and logging
    └── route53/                # DNS management
```

## Modules

### VPC Module
- Creates VPC with public, private, and database subnets
- NAT gateways for internet access from private subnets
- Internet gateway for public subnets
- VPC endpoints for AWS services

### EKS Module
- EKS cluster with multiple node groups
- Cluster add-ons (CoreDNS, kube-proxy, VPC CNI)
- IAM roles and policies
- Security groups
- OIDC provider for IRSA
- Auto-installs: cluster autoscaler, metrics server, load balancer controller

### RDS Module
- PostgreSQL database with pgvector extension
- Multi-AZ deployment for production
- Automated backups with configurable retention
- Performance Insights enabled
- Enhanced monitoring
- Encryption at rest and in transit

### Redis Module
- ElastiCache Redis cluster
- Cluster mode for production
- Automatic failover
- Encryption at rest and in transit
- Automated snapshots

### S3 Module
- Multiple buckets (documents, backups, logs)
- Versioning enabled
- Lifecycle policies
- Encryption at rest
- CORS configuration

### IRSA Module
- IAM roles for Kubernetes service accounts
- Fine-grained permissions per service account
- Integration with OIDC provider

### Secrets Manager Module
- Centralized secret management
- Auto-generate random secrets
- Secret rotation policies
- Integration with External Secrets Operator

## Configuration

### Environment Variables

```bash
# AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Terraform variables (optional)
export TF_VAR_environment="staging"
export TF_VAR_domain_name="arcqubit.com"
```

### Customization

Edit `environments/<environment>.tfvars` to customize:

**Instance Sizes**:
```hcl
rds_instance_class = "db.r6g.2xlarge"
redis_node_type    = "cache.r6g.xlarge"
```

**Scaling**:
```hcl
eks_node_groups = {
  general = {
    desired_size = 5
    min_size     = 5
    max_size     = 20
  }
}
```

**Storage**:
```hcl
rds_allocated_storage    = 500
rds_max_allocated_storage = 2000
```

## Operations

### Viewing Outputs

```bash
# View all outputs
terraform output

# View specific output
terraform output eks_cluster_endpoint
terraform output rds_endpoint

# Get output in JSON
terraform output -json
```

### Updating Infrastructure

```bash
# Review changes
terraform plan -var-file=environments/staging.tfvars

# Apply changes
terraform apply -var-file=environments/staging.tfvars
```

### Managing State

```bash
# List resources in state
terraform state list

# Show resource details
terraform state show module.eks.aws_eks_cluster.main

# Move resources
terraform state mv module.old.aws_instance.example module.new.aws_instance.example

# Remove resources from state
terraform state rm module.example.aws_instance.old
```

### Importing Existing Resources

```bash
# Import existing VPC
terraform import module.vpc.aws_vpc.main vpc-12345678

# Import existing EKS cluster
terraform import module.eks.aws_eks_cluster.main arcqubit-production
```

### Destroying Infrastructure

```bash
# DANGER: This will destroy all infrastructure
# Use with extreme caution, especially for production

# Review what will be destroyed
terraform plan -destroy -var-file=environments/staging.tfvars

# Destroy staging (requires confirmation)
terraform destroy -var-file=environments/staging.tfvars

# Destroy specific resource
terraform destroy -target=module.eks.aws_eks_node_group.workers \
  -var-file=environments/staging.tfvars
```

## Security Best Practices

### 1. State File Security
- Store state in encrypted S3 bucket
- Enable versioning for state recovery
- Use DynamoDB for state locking
- Never commit state files to Git

### 2. Secrets Management
- Store sensitive values in AWS Secrets Manager
- Use IRSA for service account permissions
- Rotate secrets regularly
- Enable secret encryption

### 3. Network Security
- Use private subnets for workloads
- Database subnets isolated from internet
- Security groups with least privilege
- VPC flow logs enabled

### 4. Access Control
- Use IAM roles instead of access keys
- Enable MFA for admin access
- Implement least privilege RBAC
- Audit IAM policies regularly

### 5. Monitoring
- Enable CloudWatch logs for all services
- Set up alarms for critical metrics
- Use CloudTrail for audit logging
- Implement log aggregation

## Cost Optimization

### Staging Environment
- Smaller instance types
- Fewer replicas
- Single-AZ deployments
- Shorter backup retention
- **Estimated cost**: $800-1,200/month

### Production Environment
- Right-sized instances
- Multi-AZ for HA
- Reserved instances for steady state
- Spot instances for workers
- **Estimated cost**: $3,500-5,000/month

### Cost Reduction Tips

1. **Use Reserved Instances**: Save 30-60% for steady-state workloads
2. **Enable Spot Instances**: Use for background workers (70% savings)
3. **Auto-scaling**: Scale down during off-hours
4. **S3 Lifecycle Policies**: Move old data to Glacier
5. **Right-size Resources**: Monitor and adjust instance sizes

## Troubleshooting

### Terraform Init Fails

```bash
# Clear cache and re-initialize
rm -rf .terraform
terraform init -upgrade
```

### State Lock Issues

```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

### EKS Cluster Access

```bash
# Update kubeconfig
aws eks update-kubeconfig --name arcqubit-staging --region us-east-1

# Test access
kubectl get nodes
kubectl get pods -A
```

### RDS Connection Issues

```bash
# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>

# Test connection from EKS
kubectl run -it --rm psql --image=postgres:16 --restart=Never -- \
  psql -h <rds-endpoint> -U arcqubit -d arcqubit_production
```

## Maintenance

### Regular Tasks

**Weekly**:
- Review CloudWatch alarms
- Check resource utilization
- Review security group rules

**Monthly**:
- Update Terraform providers
- Review and rotate secrets
- Analyze cost reports
- Update EKS cluster

**Quarterly**:
- Disaster recovery testing
- Security audit
- Performance review
- Cost optimization review

### Upgrades

**EKS Cluster**:
```bash
# Update cluster version
terraform apply -var kubernetes_version="1.29" \
  -var-file=environments/staging.tfvars

# Update node groups (rolling update)
terraform apply -var-file=environments/staging.tfvars
```

**RDS Database**:
```bash
# Update PostgreSQL version
terraform apply -var postgres_version="16.2" \
  -var-file=environments/staging.tfvars
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Terraform Plan
        run: terraform plan -var-file=environments/staging.tfvars
        working-directory: ./terraform

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve -var-file=environments/staging.tfvars
        working-directory: ./terraform
```

## Support

- **Terraform Registry**: https://registry.terraform.io
- **AWS Documentation**: https://docs.aws.amazon.com
- **GitHub Issues**: https://github.com/your-org/stella-core/issues

## License

MIT License - See LICENSE file for details
