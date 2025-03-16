output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public.*.id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private.*.id
}

output "database_subnet_ids" {
  description = "List of IDs of database subnets"
  value       = aws_subnet.database.*.id
}

output "elasticache_subnet_ids" {
  description = "List of IDs of elasticache subnets"
  value       = aws_subnet.elasticache.*.id
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "List of IDs of private route tables"
  value       = aws_route_table.private.*.id
}

output "database_route_table_ids" {
  description = "List of IDs of database route tables"
  value       = aws_route_table.database.*.id
}

output "elasticache_route_table_ids" {
  description = "List of IDs of elasticache route tables"
  value       = aws_route_table.elasticache.*.id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.nat.*.id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.igw.id
}

output "db_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = aws_db_subnet_group.database.name
}

output "elasticache_subnet_group_name" {
  description = "Name of the elasticache subnet group"
  value       = aws_elasticache_subnet_group.elasticache.name
}

output "database_security_group_id" {
  description = "ID of the security group for database instances"
  value       = aws_security_group.database.id
}

output "elasticache_security_group_id" {
  description = "ID of the security group for elasticache instances"
  value       = aws_security_group.elasticache.id
}

output "alb_security_group_id" {
  description = "ID of the security group for the application load balancer"
  value       = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  description = "ID of the security group for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = var.availability_zones
}