# Basic Environment Settings
environment = "production"
region      = "us-east-1"

# Network Configuration
vpc_cidr = "10.2.0.0/16"  # Production VPC CIDR block
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]  # Use 3 AZs for high availability
private_subnets    = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
public_subnets     = ["10.2.101.0/24", "10.2.102.0/24", "10.2.103.0/24"]
database_subnets   = ["10.2.201.0/24", "10.2.202.0/24", "10.2.203.0/24"]
elasticache_subnets = ["10.2.301.0/24", "10.2.302.0/24", "10.2.303.0/24"]
enable_nat_gateway = true
single_nat_gateway = false  # Use multiple NAT gateways for high availability

# Database Configuration
db_name                 = "admissions_platform"
db_username             = "admin"
db_password             = "ProdSecurePassword123!"  # Should be retrieved from a secrets manager in production
db_instance_class       = "db.r5.large"  # Production-grade instance class
db_allocated_storage    = 100
db_max_allocated_storage = 500
db_multi_az             = true  # Enable multi-AZ for high availability
db_backup_retention_period = 30  # 30 days retention for production

# Redis/ElastiCache Configuration
redis_node_type            = "cache.r5.large"  # Production-grade node type
redis_num_cache_nodes      = 3  # Multiple nodes for high availability
redis_parameter_group_name = "default.redis7.0"

# Container Configuration
web_container_image      = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:production"
worker_container_image   = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:production"
scheduler_container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:production"
web_container_cpu        = 1024
web_container_memory     = 2048
worker_container_cpu     = 1024
worker_container_memory  = 2048
scheduler_container_cpu  = 512
scheduler_container_memory = 1024

# Auto-scaling Configuration
web_min_capacity    = 4  # Higher minimum capacity for production
web_max_capacity    = 16  # Higher maximum capacity for peak loads
worker_min_capacity = 2
worker_max_capacity = 8

# DNS and Certificate Configuration
domain_name       = "admissions-platform.example.com"
create_dns_record = true
route53_zone_id   = "Z0123456789ABCDEFGHIJ"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890"

# CDN and Security Configuration
enable_waf       = true  # Enable WAF for security
enable_cloudfront = true  # Enable CloudFront for global distribution

# Storage Configuration
document_bucket_name = "production-admissions-platform-documents"
log_bucket_name      = "production-admissions-platform-logs"
log_retention_days   = 90

# S3 Lifecycle Rules
s3_lifecycle_rules = [
  {
    name     = "archive-documents"
    prefix   = "documents/"
    enabled  = true
    transition = [
      {
        days          = 90
        storage_class = "STANDARD_IA"
      },
      {
        days          = 365
        storage_class = "GLACIER"
      }
    ]
    expiration = {
      days = 2555  # ~7 years retention for documents
    }
  },
  {
    name     = "expire-logs"
    prefix   = "logs/"
    enabled  = true
    expiration = {
      days = 90
    }
  }
]

# Tagging
common_tags = {
  Project     = "StudentAdmissionsEnrollmentPlatform"
  Environment = "production"
  ManagedBy   = "Terraform"
  Owner       = "AdmissionsTeam"
  CostCenter  = "Admissions-101"
}