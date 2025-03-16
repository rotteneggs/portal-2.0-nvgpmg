# Environment Configuration
environment         = "dev"
region              = "us-east-1"

# Network Configuration
vpc_cidr            = "10.0.0.0/16"
availability_zones  = ["us-east-1a", "us-east-1b"]          # Using only 2 AZs to reduce costs
private_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnets      = ["10.0.101.0/24", "10.0.102.0/24"]
database_subnets    = ["10.0.201.0/24", "10.0.202.0/24"]
elasticache_subnets = ["10.0.301.0/24", "10.0.302.0/24"]
enable_nat_gateway  = true
single_nat_gateway  = true                                   # Use single NAT Gateway to reduce costs in development

# Database Configuration
db_name                     = "admissions_platform"
db_username                 = "admin"
db_password                 = "DevPassword123!"              # Would be stored in a secure location in real implementation
db_instance_class           = "db.t3.small"                  # Smaller instance class for development database to reduce costs
db_allocated_storage        = 20
db_max_allocated_storage    = 50
db_multi_az                 = false                          # Disable Multi-AZ for development database to reduce costs
db_backup_retention_period  = 7

# Redis/ElastiCache Configuration
redis_node_type       = "cache.t3.small"                     # Smaller node type for development Redis to reduce costs
redis_num_cache_nodes = 1                                    # Single cache node for development Redis to reduce costs

# Container Configuration
web_container_image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:dev"
worker_container_image     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:dev"
scheduler_container_image  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:dev"
web_container_cpu          = 256
web_container_memory       = 512
worker_container_cpu       = 256                             # Reduced from production
worker_container_memory    = 512                             # Reduced from production
scheduler_container_cpu    = 128
scheduler_container_memory = 256

# Auto-scaling Configuration
web_min_capacity     = 1                                     # Reduced from production
web_max_capacity     = 3                                     # Reduced from production
worker_min_capacity  = 1                                     # Reduced from production
worker_max_capacity  = 2                                     # Reduced from production

# Storage Configuration
document_bucket_name = "dev-admissions-platform-documents"
log_bucket_name      = "dev-admissions-platform-logs"
log_retention_days   = 30                                    # Reduced from production

# Security and CDN Configuration
enable_waf           = false                                 # Disable WAF in development to reduce costs
enable_cloudfront    = false                                 # Disable CloudFront in development to reduce costs and simplify setup
create_dns_record    = false                                 # Do not create DNS records in development

# Tagging
common_tags = {
  Project     = "StudentAdmissionsEnrollmentPlatform"
  Environment = "dev"
  ManagedBy   = "Terraform"
  Owner       = "DevOps"
  CostCenter  = "Development"
}