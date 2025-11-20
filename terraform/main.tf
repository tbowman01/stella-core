# ArcQubit Platform - Main Terraform Configuration
# This is the root module that orchestrates all infrastructure components

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for remote state
  backend "s3" {
    bucket         = "arcqubit-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "arcqubit-terraform-locks"
  }
}

# AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ArcQubit"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs = var.public_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs

  enable_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = var.common_tags
}

# EKS Kubernetes Cluster
module "eks" {
  source = "./modules/eks"

  environment        = var.environment
  cluster_name       = "${var.project_name}-${var.environment}"
  cluster_version    = var.kubernetes_version
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # Node groups
  node_groups = var.eks_node_groups

  # Cluster add-ons
  enable_cluster_autoscaler     = true
  enable_metrics_server         = true
  enable_aws_load_balancer_controller = true
  enable_external_secrets       = true
  enable_cert_manager           = true
  enable_argocd                 = true

  tags = var.common_tags

  depends_on = [module.vpc]
}

# RDS PostgreSQL Database
module "rds" {
  source = "./modules/rds"

  environment            = var.environment
  identifier             = "${var.project_name}-${var.environment}"
  engine_version         = var.postgres_version
  instance_class         = var.rds_instance_class
  allocated_storage      = var.rds_allocated_storage
  max_allocated_storage  = var.rds_max_allocated_storage

  database_name          = var.database_name
  master_username        = var.database_username

  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]

  backup_retention_period = var.rds_backup_retention
  backup_window           = var.rds_backup_window
  maintenance_window      = var.rds_maintenance_window

  multi_az               = var.environment == "production" ? true : false
  deletion_protection    = var.environment == "production" ? true : false
  skip_final_snapshot    = var.environment != "production" ? true : false

  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # PostgreSQL extensions
  parameter_group_parameters = [
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements,pgvector"
    },
    {
      name  = "max_connections"
      value = "500"
    }
  ]

  tags = var.common_tags

  depends_on = [module.vpc]
}

# ElastiCache Redis Cluster
module "redis" {
  source = "./modules/redis"

  environment            = var.environment
  cluster_id             = "${var.project_name}-${var.environment}"
  engine_version         = var.redis_version
  node_type              = var.redis_node_type
  num_cache_nodes        = var.redis_num_nodes

  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]

  # Cluster mode
  cluster_mode_enabled   = var.environment == "production" ? true : false
  automatic_failover_enabled = var.environment == "production" ? true : false

  # Backup
  snapshot_retention_limit = var.redis_snapshot_retention
  snapshot_window         = var.redis_snapshot_window

  # Persistence
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = var.common_tags

  depends_on = [module.vpc]
}

# S3 Buckets for Object Storage
module "s3" {
  source = "./modules/s3"

  environment     = var.environment
  bucket_prefix   = "${var.project_name}-${var.environment}"

  # Buckets to create
  buckets = {
    documents = {
      versioning_enabled = true
      lifecycle_rules = [
        {
          id     = "archive-old-versions"
          enabled = true
          transition = {
            days          = 90
            storage_class = "GLACIER"
          }
        }
      ]
    }
    backups = {
      versioning_enabled = true
      lifecycle_rules = [
        {
          id     = "expire-old-backups"
          enabled = true
          expiration = {
            days = 30
          }
        }
      ]
    }
    logs = {
      versioning_enabled = false
      lifecycle_rules = [
        {
          id     = "expire-old-logs"
          enabled = true
          expiration = {
            days = 90
          }
        }
      ]
    }
  }

  # CORS configuration for documents bucket
  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "PUT", "POST", "DELETE"]
      allowed_origins = ["https://*.arcqubit.com"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3000
    }
  ]

  tags = var.common_tags
}

# IAM Roles for Service Accounts (IRSA)
module "irsa" {
  source = "./modules/irsa"

  environment         = var.environment
  cluster_name        = module.eks.cluster_name
  oidc_provider_arn   = module.eks.oidc_provider_arn
  oidc_provider_url   = module.eks.oidc_provider_url

  # Service accounts and their permissions
  service_accounts = {
    arcqubit-app = {
      namespace = "arcqubit-${var.environment}"
      policy_arns = [
        module.s3.bucket_access_policy_arn,
        "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
      ]
    }
    external-secrets = {
      namespace = "external-secrets-system"
      policy_arns = [
        module.secrets_manager.read_policy_arn
      ]
    }
    cluster-autoscaler = {
      namespace = "kube-system"
      policy_arns = [
        module.eks.cluster_autoscaler_policy_arn
      ]
    }
  }

  tags = var.common_tags

  depends_on = [module.eks]
}

# AWS Secrets Manager for sensitive data
module "secrets_manager" {
  source = "./modules/secrets_manager"

  environment = var.environment
  prefix      = "${var.project_name}/${var.environment}"

  # Secrets to create
  secrets = {
    "jwt-secret" = {
      description = "JWT signing secret"
      generate    = true
      length      = 64
    }
    "database-password" = {
      description = "PostgreSQL master password"
      generate    = true
      length      = 32
    }
    "redis-password" = {
      description = "Redis authentication password"
      generate    = true
      length      = 32
    }
    "s3-access-key" = {
      description = "S3 access credentials"
      value       = module.s3.access_key_id
    }
    "s3-secret-key" = {
      description = "S3 secret credentials"
      value       = module.s3.secret_access_key
      sensitive   = true
    }
  }

  tags = var.common_tags
}

# CloudWatch Log Groups
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment = var.environment
  prefix      = "${var.project_name}/${var.environment}"

  # Log groups
  log_groups = {
    "application" = {
      retention_days = var.environment == "production" ? 30 : 7
    }
    "database" = {
      retention_days = var.environment == "production" ? 30 : 7
    }
    "redis" = {
      retention_days = var.environment == "production" ? 30 : 7
    }
  }

  # Alarms
  create_alarms = var.environment == "production"

  tags = var.common_tags
}

# Route53 DNS
module "route53" {
  source = "./modules/route53"

  environment  = var.environment
  domain_name  = var.domain_name

  # DNS records
  records = {
    "arcqubit" = {
      type = "A"
      alias = {
        name    = module.eks.load_balancer_dns
        zone_id = module.eks.load_balancer_zone_id
      }
    }
    "staging.arcqubit" = {
      type = "A"
      alias = {
        name    = module.eks.load_balancer_dns
        zone_id = module.eks.load_balancer_zone_id
      }
    }
  }

  tags = var.common_tags
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "s3_buckets" {
  description = "S3 bucket names"
  value       = module.s3.bucket_names
}

output "secrets_manager_arns" {
  description = "Secrets Manager ARNs"
  value       = module.secrets_manager.secret_arns
  sensitive   = true
}
