output "db_instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.this.id
}

output "db_instance_address" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.this.address
}

output "db_instance_endpoint" {
  description = "The connection endpoint of the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "db_instance_port" {
  description = "The port on which the database accepts connections"
  value       = aws_db_instance.this.port
}

output "db_instance_name" {
  description = "The name of the database"
  value       = aws_db_instance.this.db_name
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = aws_db_instance.this.username
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.this.arn
}

output "db_instance_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = aws_db_instance.this.availability_zone
}

output "db_instance_backup_retention_period" {
  description = "The backup retention period for the RDS instance"
  value       = aws_db_instance.this.backup_retention_period
}

output "db_instance_multi_az" {
  description = "Whether the RDS instance is multi-AZ"
  value       = aws_db_instance.this.multi_az
}

output "db_instance_status" {
  description = "The status of the RDS instance"
  value       = aws_db_instance.this.status
}

output "db_subnet_group_id" {
  description = "The ID of the DB subnet group"
  value       = aws_db_subnet_group.this.id
}

output "db_parameter_group_id" {
  description = "The ID of the DB parameter group"
  value       = aws_db_parameter_group.this.id
}

output "db_security_group_id" {
  description = "The ID of the security group used by the RDS instance"
  value       = length(var.security_group_ids) > 0 ? var.security_group_ids[0] : aws_security_group.this[0].id
}

output "db_connection_string" {
  description = "A formatted connection string (without the actual password) for application configuration"
  value       = format("%s:%s@tcp(%s:%s)/%s", aws_db_instance.this.username, "<password>", aws_db_instance.this.address, aws_db_instance.this.port, aws_db_instance.this.db_name)
}