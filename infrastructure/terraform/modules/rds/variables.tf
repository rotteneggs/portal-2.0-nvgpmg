variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "identifier" {
  description = "Identifier for the RDS instance"
  type        = string
  default     = "admissions-platform-db"
}

variable "engine" {
  description = "Database engine type"
  type        = string
  default     = "mysql"
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
  default     = "8.0"
}

variable "instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Allocated storage for the RDS instance in GB"
  type        = number
  default     = 20

  validation {
    condition     = var.allocated_storage >= 20
    error_message = "Allocated storage must be at least 20 GB."
  }
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for the RDS instance in GB (for storage autoscaling)"
  type        = number
  default     = 100

  validation {
    condition     = var.max_allocated_storage >= 20
    error_message = "Maximum allocated storage must be at least 20 GB."
  }
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "admissions_platform"
}

variable "username" {
  description = "Username for the master DB user"
  type        = string
  default     = "admin"
}

variable "password" {
  description = "Password for the master DB user (if not provided, a random one will be generated)"
  type        = string
  sensitive   = true
  default     = null
}

variable "port" {
  description = "Port on which the DB accepts connections"
  type        = number
  default     = 3306
}

variable "vpc_id" {
  description = "ID of the VPC where the RDS instance will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the RDS instance"
  type        = list(string)
  default     = []
}

variable "allowed_security_groups" {
  description = "List of security group IDs that are allowed to access the RDS instance"
  type        = list(string)
  default     = []
}

variable "multi_az" {
  description = "Whether to create a multi-AZ RDS instance for high availability"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 0 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days."
  }
}

variable "backup_window" {
  description = "Daily time range during which automated backups are created"
  type        = string
  default     = "03:00-05:00"
}

variable "maintenance_window" {
  description = "Weekly time range during which system maintenance can occur"
  type        = string
  default     = "sun:05:00-sun:07:00"
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection for the RDS instance"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Whether to skip the final snapshot when the RDS instance is deleted"
  type        = bool
  default     = false
}

variable "apply_immediately" {
  description = "Whether to apply changes immediately or during the next maintenance window"
  type        = bool
  default     = false
}

variable "monitoring_interval" {
  description = "Interval in seconds for enhanced monitoring (0 to disable)"
  type        = number
  default     = 60

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of 0, 1, 5, 10, 15, 30, 60."
  }
}

variable "monitoring_role_arn" {
  description = "ARN of the IAM role for enhanced monitoring"
  type        = string
  default     = null
}

variable "performance_insights_enabled" {
  description = "Whether to enable Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Retention period for Performance Insights data in days"
  type        = number
  default     = 7

  validation {
    condition     = var.performance_insights_retention_period == 7 || var.performance_insights_retention_period == 731
    error_message = "Performance Insights retention period must be 7 (free tier) or 731 (paid)."
  }
}

variable "kms_key_id" {
  description = "ARN of the KMS key for encryption at rest"
  type        = string
  default     = null
}

variable "option_group_name" {
  description = "Name of the DB option group to associate with the RDS instance"
  type        = string
  default     = null
}

variable "max_connections" {
  description = "Maximum number of database connections"
  type        = number
  default     = 100
}

variable "common_tags" {
  description = "Map of common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "parameter_group_name" {
  description = "Name of the DB parameter group to associate with the RDS instance"
  type        = string
  default     = null
}

variable "character_set_name" {
  description = "Character set name to use for DB encoding"
  type        = string
  default     = null
}

variable "storage_encrypted" {
  description = "Whether the DB instance storage should be encrypted"
  type        = bool
  default     = true
}

variable "storage_type" {
  description = "Type of storage to use for the DB instance (gp2, gp3, io1)"
  type        = string
  default     = "gp2"

  validation {
    condition     = contains(["gp2", "gp3", "io1"], var.storage_type)
    error_message = "Storage type must be one of gp2, gp3, or io1."
  }
}

variable "iops" {
  description = "Amount of provisioned IOPS for the DB instance (only used with io1 storage type)"
  type        = number
  default     = null
}

variable "enabled_cloudwatch_logs_exports" {
  description = "List of log types to enable for exporting to CloudWatch"
  type        = list(string)
  default     = ["audit", "error", "general", "slowquery"]
}

variable "auto_minor_version_upgrade" {
  description = "Whether to automatically upgrade minor engine versions during the maintenance window"
  type        = bool
  default     = true
}

variable "publicly_accessible" {
  description = "Whether the DB instance is publicly accessible"
  type        = bool
  default     = false
}