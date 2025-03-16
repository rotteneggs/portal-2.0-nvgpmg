environment      = "staging"
region           = "us-east-1"
vpc_cidr         = "10.1.0.0/16"  # Separate CIDR from dev/production

# Network Configuration
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnets    = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
public_subnets     = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
database_subnets   = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]
elasticache_subnets = ["10.1.301.0/24", "10.1.302.0/24", "10.1.303.0/24"]
enable_nat_gateway = true
single_nat_gateway = false  # Use multiple NAT gateways for high availability

# Database Configuration
db_password          = "StagingSecurePassword123!"  # Should be stored in AWS Secrets Manager in real deployment
rds_identifier       = "staging-admissions-platform-db"
rds_instance_class   = "db.t3.medium"
rds_allocated_storage = 50
rds_max_allocated_storage = 100
db_name              = "admissions_platform"
db_username          = "admin"

# Redis Configuration
redis_cluster_id     = "staging-admissions-platform-redis"
redis_node_type      = "cache.t3.medium"
redis_num_cache_nodes = 2  # For high availability in staging

# S3 Storage Configuration
document_bucket_name = "staging-admissions-platform-documents"
log_bucket_name      = "staging-admissions-platform-logs"
s3_lifecycle_rules   = [
  {
    name    = "archive-documents"
    prefix  = "documents/"
    enabled = true
    transition = [
      {
        days          = 90
        storage_class = "STANDARD_IA"
      }
    ]
    expiration = {
      days = 365
    }
  }
]

# Container Images
web_container_image       = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:staging"
worker_container_image    = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:staging"
scheduler_container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:staging"

# ECS Cluster Configuration
ecs_cluster_name    = "staging-admissions-platform-cluster"
web_container_cpu   = 512
web_container_memory = 1024
web_desired_count   = 2
web_min_count       = 2
web_max_count       = 4
worker_container_cpu = 512
worker_container_memory = 1024
worker_desired_count = 2
worker_min_count    = 1
worker_max_count    = 3
scheduler_container_cpu = 256
scheduler_container_memory = 512

# DNS and SSL Configuration
domain_name         = "staging.admissions-platform.example.com"
create_dns_record   = true
route53_zone_id     = "Z0123456789ABCDEFGHIJ"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890"

# CDN and WAF Configuration
enable_waf          = true
enable_cloudfront   = true

# Logging Configuration
log_retention_days  = 60

# Resource Tagging
common_tags = {
  Project     = "StudentAdmissionsEnrollmentPlatform"
  Environment = "staging"
  ManagedBy   = "Terraform"
  Owner       = "DevOps"
  CostCenter  = "PreProduction"
}