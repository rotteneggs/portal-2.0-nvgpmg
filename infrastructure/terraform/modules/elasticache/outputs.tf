output "redis_endpoint" {
  description = "The primary endpoint address of the Redis cluster"
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
}

output "redis_port" {
  description = "The port number on which the Redis cluster accepts connections"
  value       = var.port
}

output "redis_security_group_id" {
  description = "The ID of the security group associated with the Redis cluster"
  value       = length(var.security_group_ids) > 0 ? var.security_group_ids[0] : aws_security_group.redis_security_group[0].id
}

output "redis_subnet_group_name" {
  description = "The name of the Redis subnet group"
  value       = aws_elasticache_subnet_group.redis_subnet_group.name
}

output "redis_parameter_group_name" {
  description = "The name of the Redis parameter group"
  value       = aws_elasticache_parameter_group.redis_parameter_group.name
}

output "redis_auth_token" {
  description = "The authentication token for Redis connections"
  value       = random_password.redis_auth_token.result
  sensitive   = true
}

output "redis_replication_group_id" {
  description = "The ID of the Redis replication group"
  value       = aws_elasticache_replication_group.redis_cluster.id
}

output "redis_reader_endpoint_address" {
  description = "The reader endpoint address of the Redis cluster for read operations"
  value       = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
}

output "redis_configuration_endpoint_address" {
  description = "The configuration endpoint address of the Redis cluster (only applicable for cluster mode enabled)"
  value       = aws_elasticache_replication_group.redis_cluster.configuration_endpoint_address
}

output "redis_arn" {
  description = "The ARN of the Redis replication group"
  value       = aws_elasticache_replication_group.redis_cluster.arn
}