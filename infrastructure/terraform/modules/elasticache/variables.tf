variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "cluster_id" {
  description = "Identifier for the Redis cluster"
  type        = string
  default     = "admissions-redis"
}

variable "engine" {
  description = "Redis engine type"
  type        = string
  default     = "redis"
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "port" {
  description = "Port number for Redis connections"
  type        = number
  default     = 6379
}

variable "node_type" {
  description = "Instance type for Redis nodes"
  type        = string
  default     = "cache.t3.medium"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 1
}

variable "subnet_ids" {
  description = "List of subnet IDs for the Redis subnet group"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID where Redis will be deployed"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs to associate with the Redis cluster"
  type        = list(string)
  default     = []
}

variable "allowed_security_groups" {
  description = "List of security group IDs that are allowed to access the Redis cluster"
  type        = list(string)
  default     = []
}

variable "automatic_failover_enabled" {
  description = "Whether to enable automatic failover for Redis"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Whether to enable Multi-AZ deployment for Redis"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Whether to apply changes immediately or during the next maintenance window"
  type        = bool
  default     = false
}

variable "parameter_group_name" {
  description = "Name of the parameter group to use (if not using the module-created one)"
  type        = string
  default     = ""
}

variable "maintenance_window" {
  description = "Preferred maintenance window for Redis"
  type        = string
  default     = "sun:05:00-sun:07:00"
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range during which snapshots are taken"
  type        = string
  default     = "03:00-05:00"
}

variable "notification_topic_arn" {
  description = "ARN of an SNS topic for Redis notifications"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Map of common tags to apply to all resources"
  type        = map(string)
  default     = {}
}