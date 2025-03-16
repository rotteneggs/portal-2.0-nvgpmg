# Terraform configuration file for Student Admissions Enrollment Platform - Staging Environment
# This file defines the infrastructure for the staging environment, a pre-production environment
# that closely resembles production but with appropriately sized resources.

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  
  # Backend configuration for Terraform state
  backend "s3" {
    bucket         = "admissions-platform-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "admissions-platform-terraform-locks"
  }
}

# Provider configuration
provider "aws" {
  region  = var.region
  profile = "staging"  # Use a specific AWS profile for staging
}

# Local variables
locals {
  common_tags = {
    Environment = "staging"
    Project     = "StudentAdmissionsEnrollmentPlatform"
    ManagedBy   = "Terraform"
  }
}

# VPC Module
module "vpc" {
  source             = "../../modules/vpc"
  environment        = "staging"
  region             = var.region
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets
  database_subnets   = var.database_subnets
  elasticache_subnets = var.elasticache_subnets
  enable_nat_gateway = true
  single_nat_gateway = false  # For high availability, use multiple NAT gateways
  flow_log_bucket_arn = module.s3.log_bucket_arn
  common_tags        = local.common_tags
}

# RDS Module
module "rds" {
  source                = "../../modules/rds"
  environment           = "staging"
  identifier            = var.rds_identifier
  engine                = "mysql"
  engine_version        = "8.0"
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  db_name               = var.db_name
  username              = var.db_username
  password              = var.db_password
  port                  = 3306
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.database_subnet_ids
  security_group_ids    = []
  allowed_security_groups = [module.vpc.ecs_tasks_security_group_id]
  multi_az              = true  # Enable high availability
  backup_retention_period = 7
  backup_window         = "03:00-04:00"
  maintenance_window    = "sun:04:30-sun:05:30"
  deletion_protection   = true
  skip_final_snapshot   = false
  apply_immediately     = false
  monitoring_interval   = 60
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  max_connections       = 200
  common_tags           = local.common_tags
}

# ElastiCache Module
module "elasticache" {
  source                  = "../../modules/elasticache"
  environment             = "staging"
  cluster_id              = var.redis_cluster_id
  engine                  = "redis"
  engine_version          = "7.0"
  node_type               = var.redis_node_type
  port                    = 6379
  num_cache_nodes         = var.redis_num_cache_nodes
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.elasticache_subnet_ids
  security_group_ids      = []
  allowed_security_groups = [module.vpc.ecs_tasks_security_group_id]
  automatic_failover_enabled = true
  multi_az_enabled        = true
  apply_immediately       = false
  common_tags             = local.common_tags
}

# S3 Module
module "s3" {
  source               = "../../modules/s3"
  environment          = "staging"
  document_bucket_name = var.document_bucket_name
  log_bucket_name      = var.log_bucket_name
  enable_versioning    = true
  lifecycle_rules      = var.s3_lifecycle_rules
  domain_name          = var.domain_name
  enable_replication   = false  # No cross-region replication for staging
  replica_region       = "us-west-2"
  common_tags          = local.common_tags
}

# ECS Module
module "ecs" {
  source                 = "../../modules/ecs"
  environment            = "staging"
  region                 = var.region
  cluster_name           = var.ecs_cluster_name
  vpc_id                 = module.vpc.vpc_id
  public_subnet_ids      = module.vpc.public_subnet_ids
  private_subnet_ids     = module.vpc.private_subnet_ids
  
  # Container configurations
  web_container_image    = var.web_container_image
  worker_container_image = var.worker_container_image
  scheduler_container_image = var.scheduler_container_image
  web_container_port     = 80
  
  # Resource allocations
  web_container_cpu      = var.web_container_cpu
  web_container_memory   = var.web_container_memory
  worker_container_cpu   = var.worker_container_cpu
  worker_container_memory = var.worker_container_memory
  scheduler_container_cpu = var.scheduler_container_cpu
  scheduler_container_memory = var.scheduler_container_memory
  
  # Service scaling
  web_desired_count      = var.web_desired_count
  web_min_count          = var.web_min_count
  web_max_count          = var.web_max_count
  worker_desired_count   = var.worker_desired_count
  worker_min_count       = var.worker_min_count
  worker_max_count       = var.worker_max_count
  
  # Health check configuration
  health_check_path      = "/api/health"
  health_check_interval  = 30
  health_check_timeout   = 5
  health_check_healthy_threshold = 3
  health_check_unhealthy_threshold = 3
  
  # Autoscaling
  enable_autoscaling     = true
  cpu_utilization_high_threshold = 70
  
  # Application configuration
  db_host                = module.rds.db_instance_address
  db_name                = var.db_name
  db_username            = var.db_username
  db_password            = var.db_password
  redis_host             = module.elasticache.redis_endpoint
  document_bucket_name   = module.s3.document_bucket_name
  log_bucket_name        = module.s3.log_bucket_name
  sqs_queue_name         = aws_sqs_queue.main_queue.name
  
  # DNS and SSL
  acm_certificate_arn    = var.acm_certificate_arn
  domain_name            = var.domain_name
  create_dns_record      = var.create_dns_record
  route53_zone_id        = var.route53_zone_id
  
  common_tags            = local.common_tags
}

# SQS Queues
resource "aws_sqs_queue" "main_queue" {
  name                      = "staging-admissions-queue"
  delay_seconds             = 0
  max_message_size          = 262144  # 256 KB
  message_retention_seconds = 345600  # 4 days
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 300    # 5 minutes
  redrive_policy            = jsonencode({
    "deadLetterTargetArn" = aws_sqs_queue.dead_letter_queue.arn,
    "maxReceiveCount"     = 5
  })
  tags = merge(
    {"Name" = "staging-admissions-queue"},
    local.common_tags
  )
}

resource "aws_sqs_queue" "dead_letter_queue" {
  name                      = "staging-admissions-dlq"
  message_retention_seconds = 1209600  # 14 days
  tags = merge(
    {"Name" = "staging-admissions-dlq"},
    local.common_tags
  )
}

# Store sensitive information in SSM Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name        = "/staging/db/password"
  type        = "SecureString"
  value       = var.db_password
  description = "Database password for the staging environment"
  tags        = local.common_tags
}

# Outputs
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "The ID of the VPC"
}

output "db_instance_endpoint" {
  value       = module.rds.db_instance_endpoint
  description = "The connection endpoint for the RDS instance"
}

output "redis_endpoint" {
  value       = module.elasticache.redis_endpoint
  description = "The endpoint of the Redis ElastiCache cluster"
}

output "document_bucket_name" {
  value       = module.s3.document_bucket_name
  description = "The name of the S3 bucket for document storage"
}

output "log_bucket_name" {
  value       = module.s3.log_bucket_name
  description = "The name of the S3 bucket for logs"
}

output "alb_dns_name" {
  value       = module.ecs.alb_dns_name
  description = "The DNS name of the application load balancer"
}

output "application_url" {
  value       = var.create_dns_record ? "https://${var.domain_name}" : "https://${module.ecs.alb_dns_name}"
  description = "The URL to access the application"
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.main_queue.url
  description = "The URL of the main SQS queue"
}

output "dead_letter_queue_url" {
  value       = aws_sqs_queue.dead_letter_queue.url
  description = "The URL of the dead letter queue"
}