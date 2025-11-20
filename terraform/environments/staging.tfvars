# Staging Environment Configuration

environment  = "staging"
project_name = "arcqubit"
owner        = "platform-team@arcqubit.com"
aws_region   = "us-east-1"

# Networking - Smaller CIDR for staging
vpc_cidr             = "10.1.0.0/16"
private_subnet_cidrs = ["10.1.1.0/24", "10.1.2.0/24"]
public_subnet_cidrs  = ["10.1.101.0/24", "10.1.102.0/24"]
database_subnet_cidrs = ["10.1.201.0/24", "10.1.202.0/24"]

# EKS - Smaller cluster for staging
kubernetes_version = "1.28"

eks_node_groups = {
  general = {
    desired_size   = 2
    min_size       = 2
    max_size       = 5
    instance_types = ["t3.large"]
    disk_size      = 50
    labels = {
      workload    = "general"
      environment = "staging"
    }
    taints = []
  }
  workers = {
    desired_size   = 2
    min_size       = 2
    max_size       = 10
    instance_types = ["t3.medium"]
    disk_size      = 30
    labels = {
      workload    = "background-jobs"
      environment = "staging"
    }
    taints = []
  }
}

# RDS - Smaller instance for staging
postgres_version         = "16.1"
rds_instance_class       = "db.t3.large"
rds_allocated_storage    = 50
rds_max_allocated_storage = 200
database_name            = "arcqubit_staging"
database_username        = "arcqubit"
rds_backup_retention     = 7
rds_backup_window        = "03:00-04:00"
rds_maintenance_window   = "sun:04:00-sun:05:00"

# Redis - Smaller nodes for staging
redis_version            = "7.1"
redis_node_type          = "cache.t3.medium"
redis_num_nodes          = 2
redis_snapshot_retention = 3
redis_snapshot_window    = "05:00-06:00"

# DNS
domain_name = "arcqubit.com"

# Monitoring
enable_monitoring = true
alert_email       = "staging-alerts@arcqubit.com"

# Tags
common_tags = {
  Project     = "ArcQubit"
  Environment = "Staging"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
  Owner       = "platform-team@arcqubit.com"
}
