# General environment information
output "environment" {
  description = "The deployment environment (dev, staging, production)"
  value       = var.environment
}

output "region" {
  description = "The AWS region where resources are deployed"
  value       = var.region
}

# VPC and networking outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnet_ids
}

output "elasticache_subnet_ids" {
  description = "List of IDs of elasticache subnets"
  value       = module.vpc.elasticache_subnet_ids
}

# RDS database outputs
output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "db_instance_address" {
  description = "The hostname of the RDS instance"
  value       = module.rds.db_instance_address
}

output "db_instance_port" {
  description = "The port of the RDS instance"
  value       = module.rds.db_instance_port
}

output "db_instance_name" {
  description = "The name of the database"
  value       = module.rds.db_instance_name
}

output "db_instance_username" {
  description = "The master username for the RDS instance"
  value       = module.rds.db_instance_username
  sensitive   = true
}

output "db_instance_password" {
  description = "The master password for the RDS instance"
  value       = module.rds.db_instance_password
  sensitive   = true
}

output "db_instance_multi_az" {
  description = "Whether the RDS instance is multi-AZ"
  value       = module.rds.db_instance_multi_az
}

# ElastiCache (Redis) outputs
output "redis_endpoint" {
  description = "The endpoint of the primary Redis node"
  value       = module.elasticache.redis_endpoint
}

output "redis_port" {
  description = "The port number of the Redis cluster"
  value       = module.elasticache.redis_port
}

output "redis_replication_group_id" {
  description = "The ID of the ElastiCache replication group"
  value       = module.elasticache.redis_replication_group_id
}

# ECS cluster and services outputs
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster"
  value       = module.ecs.cluster_id
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "alb_dns_name" {
  description = "The DNS name of the application load balancer"
  value       = module.ecs.alb_dns_name
}

output "alb_zone_id" {
  description = "The canonical hosted zone ID of the load balancer (for Route53 alias records)"
  value       = module.ecs.alb_zone_id
}

output "web_service_name" {
  description = "The name of the web service"
  value       = module.ecs.web_service_name
}

output "worker_service_name" {
  description = "The name of the worker service"
  value       = module.ecs.worker_service_name
}

output "scheduler_service_name" {
  description = "The name of the scheduler service"
  value       = module.ecs.scheduler_service_name
}

# S3 bucket outputs
output "document_bucket_name" {
  description = "The name of the S3 bucket for document storage"
  value       = module.s3.document_bucket_name
}

output "document_bucket_arn" {
  description = "The ARN of the S3 bucket for document storage"
  value       = module.s3.document_bucket_arn
}

output "document_bucket_domain_name" {
  description = "The domain name of the document bucket for constructing URLs"
  value       = module.s3.document_bucket_domain_name
}

output "log_bucket_name" {
  description = "The name of the S3 bucket for logs"
  value       = module.s3.log_bucket_name
}

output "replica_bucket_name" {
  description = "The name of the replica S3 bucket for document storage (only in production with replication enabled)"
  value       = module.s3.replica_bucket_name
}

# CloudFront distribution outputs
output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution (if enabled)"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.main[0].id : null
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution (if enabled)"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.main[0].domain_name : null
}

# SQS queue outputs
output "sqs_queue_url" {
  description = "The URL of the main SQS queue"
  value       = aws_sqs_queue.main_queue.url
}

output "dead_letter_queue_url" {
  description = "The URL of the dead letter queue"
  value       = aws_sqs_queue.dead_letter_queue.url
}

# Application access URL
output "application_url" {
  description = "The URL to access the application"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : var.enable_cloudfront ? "https://${aws_cloudfront_distribution.main[0].domain_name}" : "http://${module.ecs.alb_dns_name}"
}