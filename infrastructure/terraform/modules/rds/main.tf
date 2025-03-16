terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

locals {
  db_security_group_id = length(var.security_group_ids) > 0 ? var.security_group_ids[0] : aws_security_group.this[0].id
}

# Generate a secure random password if none is provided
resource "random_password" "db_password" {
  count             = var.password == null ? 1 : 0
  length            = 16
  special           = true
  override_special  = "!#$%&*()-_=+[]{}<>:?"
  min_special       = 2
  min_upper         = 2
  min_lower         = 2
  min_numeric       = 2
}

# Create a subnet group for the RDS instance
resource "aws_db_subnet_group" "this" {
  name        = "${var.identifier}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${var.identifier} RDS instance"
  
  tags = merge(var.common_tags, {
    Name = "${var.identifier}-subnet-group"
  })
}

# Create a security group for the RDS instance if none are provided
resource "aws_security_group" "this" {
  count       = length(var.security_group_ids) == 0 ? 1 : 0
  name        = "${var.identifier}-sg"
  description = "Security group for ${var.identifier} RDS instance"
  vpc_id      = var.vpc_id
  
  tags = merge(var.common_tags, {
    Name = "${var.identifier}-sg"
  })
}

# Create ingress rules for the security group to allow access from specified security groups
resource "aws_security_group_rule" "ingress" {
  count                    = length(var.security_group_ids) == 0 && length(var.allowed_security_groups) > 0 ? length(var.allowed_security_groups) : 0
  security_group_id        = aws_security_group.this[0].id
  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = element(var.allowed_security_groups, count.index)
}

# Create egress rule for the security group to allow all outbound traffic
resource "aws_security_group_rule" "egress" {
  count             = length(var.security_group_ids) == 0 ? 1 : 0
  security_group_id = aws_security_group.this[0].id
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}

# Create a parameter group for the RDS instance with optimized settings
resource "aws_db_parameter_group" "this" {
  name        = "${var.identifier}-parameter-group"
  family      = var.engine == "mysql" ? "mysql8.0" : "postgres13"
  description = "Parameter group for ${var.identifier} RDS instance"
  
  parameter {
    name         = "max_connections"
    value        = var.max_connections
    apply_method = "pending-reboot"
  }
  
  parameter {
    name         = "character_set_server"
    value        = "utf8mb4"
    apply_method = "immediate"
  }
  
  parameter {
    name         = "collation_server"
    value        = "utf8mb4_unicode_ci"
    apply_method = "immediate"
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.identifier}-parameter-group"
  })
}

# Create the RDS database instance with the specified configuration
resource "aws_db_instance" "this" {
  identifier                  = var.identifier
  engine                      = var.engine
  engine_version              = var.engine_version
  instance_class              = var.instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = "gp2"
  storage_encrypted           = true
  kms_key_id                  = var.kms_key_id
  db_name                     = var.db_name
  username                    = var.username
  password                    = var.password == null ? random_password.db_password[0].result : var.password
  port                        = var.port
  vpc_security_group_ids      = length(var.security_group_ids) > 0 ? var.security_group_ids : [aws_security_group.this[0].id]
  db_subnet_group_name        = aws_db_subnet_group.this.name
  parameter_group_name        = aws_db_parameter_group.this.name
  option_group_name           = var.option_group_name
  multi_az                    = var.multi_az
  publicly_accessible         = false
  backup_retention_period     = var.backup_retention_period
  backup_window               = var.backup_window
  maintenance_window          = var.maintenance_window
  deletion_protection         = var.deletion_protection
  skip_final_snapshot         = var.skip_final_snapshot
  final_snapshot_identifier   = var.skip_final_snapshot ? null : "${var.identifier}-final-snapshot"
  apply_immediately           = var.apply_immediately
  monitoring_interval         = var.monitoring_interval
  monitoring_role_arn         = var.monitoring_role_arn
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]
  auto_minor_version_upgrade  = true
  copy_tags_to_snapshot       = true
  
  tags = merge(var.common_tags, {
    Name = var.identifier
  })
}