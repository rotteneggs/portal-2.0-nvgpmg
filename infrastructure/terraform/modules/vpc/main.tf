# AWS Provider configuration is expected to be defined at the root module level

# Create the main VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  
  tags = merge(
    {
      Name = "${var.environment}-vpc"
    },
    var.common_tags
  )
}

# Public subnets - for load balancers and public-facing resources
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = element(var.public_subnets, count.index)
  availability_zone       = element(var.availability_zones, count.index)
  map_public_ip_on_launch = true
  
  tags = merge(
    {
      Name = "${var.environment}-public-subnet-${count.index + 1}"
    },
    var.common_tags
  )
}

# Private subnets - for application servers and containers
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.private_subnets, count.index)
  availability_zone = element(var.availability_zones, count.index)
  
  tags = merge(
    {
      Name = "${var.environment}-private-subnet-${count.index + 1}"
    },
    var.common_tags
  )
}

# Database subnets - for RDS instances
resource "aws_subnet" "database" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.database_subnets, count.index)
  availability_zone = element(var.availability_zones, count.index)
  
  tags = merge(
    {
      Name = "${var.environment}-database-subnet-${count.index + 1}"
    },
    var.common_tags
  )
}

# ElastiCache subnets - for Redis instances
resource "aws_subnet" "elasticache" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.elasticache_subnets, count.index)
  availability_zone = element(var.availability_zones, count.index)
  
  tags = merge(
    {
      Name = "${var.environment}-elasticache-subnet-${count.index + 1}"
    },
    var.common_tags
  )
}

# Internet Gateway for public internet access
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    {
      Name = "${var.environment}-igw"
    },
    var.common_tags
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  vpc   = true
  
  tags = merge(
    {
      Name = "${var.environment}-nat-eip-${count.index + 1}"
    },
    var.common_tags
  )
}

# NAT Gateways for private subnet internet access
resource "aws_nat_gateway" "nat" {
  count         = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  allocation_id = element(aws_eip.nat.*.id, count.index)
  subnet_id     = element(aws_subnet.public.*.id, count.index)
  
  tags = merge(
    {
      Name = "${var.environment}-nat-gw-${count.index + 1}"
    },
    var.common_tags
  )
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    {
      Name = "${var.environment}-public-rt"
    },
    var.common_tags
  )
}

# Internet Gateway route for public subnets
resource "aws_route" "public_internet_gateway" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

# Route tables for private subnets
resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : length(var.availability_zones)
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    {
      Name = "${var.environment}-private-rt-${count.index + 1}"
    },
    var.common_tags
  )
}

# NAT Gateway routes for private subnets
resource "aws_route" "private_nat_gateway" {
  count                  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  route_table_id         = element(aws_route_table.private.*.id, count.index)
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = element(aws_nat_gateway.nat.*.id, var.single_nat_gateway ? 0 : count.index)
}

# Route tables for database subnets
resource "aws_route_table" "database" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    {
      Name = "${var.environment}-database-rt-${count.index + 1}"
    },
    var.common_tags
  )
}

# Route tables for elasticache subnets
resource "aws_route_table" "elasticache" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    {
      Name = "${var.environment}-elasticache-rt-${count.index + 1}"
    },
    var.common_tags
  )
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = element(aws_subnet.public.*.id, count.index)
  route_table_id = aws_route_table.public.id
}

# Associate private subnets with private route tables
resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = element(aws_subnet.private.*.id, count.index)
  route_table_id = element(aws_route_table.private.*.id, var.single_nat_gateway ? 0 : count.index)
}

# Associate database subnets with database route tables
resource "aws_route_table_association" "database" {
  count          = length(var.availability_zones)
  subnet_id      = element(aws_subnet.database.*.id, count.index)
  route_table_id = element(aws_route_table.database.*.id, count.index)
}

# Associate elasticache subnets with elasticache route tables
resource "aws_route_table_association" "elasticache" {
  count          = length(var.availability_zones)
  subnet_id      = element(aws_subnet.elasticache.*.id, count.index)
  route_table_id = element(aws_route_table.elasticache.*.id, count.index)
}

# Database subnet group for RDS instances
resource "aws_db_subnet_group" "database" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database.*.id
  
  tags = merge(
    {
      Name = "${var.environment}-db-subnet-group"
    },
    var.common_tags
  )
}

# ElastiCache subnet group for Redis instances
resource "aws_elasticache_subnet_group" "elasticache" {
  name       = "${var.environment}-elasticache-subnet-group"
  subnet_ids = aws_subnet.elasticache.*.id
  
  tags = merge(
    {
      Name = "${var.environment}-elasticache-subnet-group"
    },
    var.common_tags
  )
}

# Security group for database instances
resource "aws_security_group" "database" {
  name        = "${var.environment}-database-sg"
  description = "Security group for database instances"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "MySQL access from ECS tasks"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-database-sg"
    },
    var.common_tags
  )
}

# Security group for ElastiCache instances
resource "aws_security_group" "elasticache" {
  name        = "${var.environment}-elasticache-sg"
  description = "Security group for ElastiCache instances"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "Redis access from ECS tasks"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-elasticache-sg"
    },
    var.common_tags
  )
}

# Security group for application load balancer
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "Security group for application load balancer"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access from anywhere"
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access from anywhere"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-alb-sg"
    },
    var.common_tags
  )
}

# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.alb.id]
    description     = "Access from ALB"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-ecs-tasks-sg"
    },
    var.common_tags
  )
}

# VPC Flow Logs for network traffic monitoring and security compliance
resource "aws_flow_log" "vpc_flow_log" {
  count                = var.flow_log_bucket_arn != null ? 1 : 0
  log_destination      = var.flow_log_bucket_arn
  log_destination_type = "s3"
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main.id
  
  tags = merge(
    {
      Name = "${var.environment}-vpc-flow-log"
    },
    var.common_tags
  )
}

# Network ACL for public subnets
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public.*.id
  
  ingress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = "0.0.0.0/0"
  }
  
  egress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = "0.0.0.0/0"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-public-nacl"
    },
    var.common_tags
  )
}

# Network ACL for private subnets
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private.*.id
  
  ingress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = var.vpc_cidr
  }
  
  ingress {
    rule_no    = 110
    action     = "allow"
    from_port  = 1024
    to_port    = 65535
    protocol   = "tcp"
    cidr_block = "0.0.0.0/0"
  }
  
  egress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = "0.0.0.0/0"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-private-nacl"
    },
    var.common_tags
  )
}

# Network ACL for database subnets
resource "aws_network_acl" "database" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.database.*.id
  
  ingress {
    rule_no    = 100
    action     = "allow"
    from_port  = 3306
    to_port    = 3306
    protocol   = "tcp"
    cidr_block = var.vpc_cidr
  }
  
  ingress {
    rule_no    = 110
    action     = "allow"
    from_port  = 1024
    to_port    = 65535
    protocol   = "tcp"
    cidr_block = "0.0.0.0/0"
  }
  
  egress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = "0.0.0.0/0"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-database-nacl"
    },
    var.common_tags
  )
}

# Network ACL for elasticache subnets
resource "aws_network_acl" "elasticache" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.elasticache.*.id
  
  ingress {
    rule_no    = 100
    action     = "allow"
    from_port  = 6379
    to_port    = 6379
    protocol   = "tcp"
    cidr_block = var.vpc_cidr
  }
  
  ingress {
    rule_no    = 110
    action     = "allow"
    from_port  = 1024
    to_port    = 65535
    protocol   = "tcp"
    cidr_block = "0.0.0.0/0"
  }
  
  egress {
    rule_no    = 100
    action     = "allow"
    from_port  = 0
    to_port    = 0
    protocol   = "-1"
    cidr_block = "0.0.0.0/0"
  }
  
  tags = merge(
    {
      Name = "${var.environment}-elasticache-nacl"
    },
    var.common_tags
  )
}