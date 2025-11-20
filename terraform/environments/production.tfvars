# Production Environment Configuration

environment  = "production"
project_name = "arcqubit"
owner        = "platform-team@arcqubit.com"
aws_region   = "us-east-1"

# Networking - Full VPC for production
vpc_cidr             = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnet_cidrs = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

# EKS - Production-grade cluster
kubernetes_version = "1.28"

eks_node_groups = {
  general = {
    desired_size   = 5
    min_size       = 5
    max_size       = 20
    instance_types = ["m5.2xlarge"]
    disk_size      = 100
    labels = {
      workload    = "general"
      environment = "production"
    }
    taints = []
  }
  workers = {
    desired_size   = 10
    min_size       = 10
    max_size       = 50
    instance_types = ["m5.xlarge"]
    disk_size      = 50
    labels = {
      workload    = "background-jobs"
      environment = "production"
    }
    taints = []
  }
  database-intensive = {
    desired_size   = 3
    min_size       = 3
    max_size       = 10
    instance_types = ["r5.2xlarge"]
    disk_size      = 200
    labels = {
      workload    = "database-intensive"
      environment = "production"
    }
    taints = [
      {
        key    = "workload"
        value  = "database-intensive"
        effect = "NoSchedule"
      }
    ]
  }
}

# RDS - Production instance with high availability
postgres_version         = "16.1"
rds_instance_class       = "db.r6g.2xlarge"
rds_allocated_storage    = 500
rds_max_allocated_storage = 2000
database_name            = "arcqubit_production"
database_username        = "arcqubit"
rds_backup_retention     = 30
rds_backup_window        = "03:00-04:00"
rds_maintenance_window   = "sun:04:00-sun:05:00"

# Redis - Production cluster with high availability
redis_version            = "7.1"
redis_node_type          = "cache.r6g.xlarge"
redis_num_nodes          = 6
redis_snapshot_retention = 14
redis_snapshot_window    = "05:00-06:00"

# DNS
domain_name = "arcqubit.com"

# Monitoring
enable_monitoring = true
alert_email       = "production-alerts@arcqubit.com"

# Tags
common_tags = {
  Project     = "ArcQubit"
  Environment = "Production"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
  Owner       = "platform-team@arcqubit.com"
  Compliance  = "HIPAA,SOC2"
  Backup      = "Required"
}
