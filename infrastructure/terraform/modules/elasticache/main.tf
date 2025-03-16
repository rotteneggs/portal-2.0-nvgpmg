# This module provisions an AWS ElastiCache Redis cluster for the Student Admissions Enrollment Platform
# It supports high availability, encryption, and optimal performance settings for caching and session management
# AWS Provider version ~> 4.0

# Generate a secure random password for Redis authentication
resource "random_password" "redis_auth_token" {
  length           = 16
  special          = false
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Create a subnet group for the Redis cluster using the provided subnet IDs
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name        = "${var.environment}-${var.cluster_id}-subnet-group"
  description = "Subnet group for ${var.environment} Redis cluster"
  subnet_ids  = var.subnet_ids
}

# Create a parameter group with optimized settings for caching and session management
resource "aws_elasticache_parameter_group" "redis_parameter_group" {
  name        = "${var.environment}-${var.cluster_id}-params"
  family      = "redis7.0"
  description = "Parameter group for ${var.environment} Redis cluster"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"  # LRU eviction for expired keys (optimal for caching)
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Notify on expired keys (useful for session management)
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }
}

# Create a security group for Redis if none is provided
# Only allow access from specified security groups for enhanced security
resource "aws_security_group" "redis_security_group" {
  count       = length(var.security_group_ids) > 0 ? 0 : 1
  name        = "${var.environment}-${var.cluster_id}-sg"
  description = "Security group for ${var.environment} Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-${var.cluster_id}-sg"
  })
}

# Determine which security group ID to use based on whether custom security groups were provided
locals {
  redis_security_group_id = length(var.security_group_ids) > 0 ? var.security_group_ids[0] : aws_security_group.redis_security_group[0].id
}

# Create a Redis replication group with encryption, failover capabilities, and appropriate configuration
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id       = "${var.environment}-${var.cluster_id}"
  description                = "Redis cluster for ${var.environment}"
  engine                     = var.engine
  engine_version             = var.engine_version
  node_type                  = var.node_type
  port                       = var.port
  parameter_group_name       = aws_elasticache_parameter_group.redis_parameter_group.name
  subnet_group_name          = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids         = length(var.security_group_ids) > 0 ? var.security_group_ids : [aws_security_group.redis_security_group[0].id]
  num_cache_clusters         = var.num_cache_nodes
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled
  apply_immediately          = var.apply_immediately
  at_rest_encryption_enabled = true  # Enable encryption at rest for security
  transit_encryption_enabled = true  # Enable encryption in transit for security
  auth_token                 = random_password.redis_auth_token.result

  tags = merge(var.common_tags, {
    Name = "${var.environment}-${var.cluster_id}"
  })
}