resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.name_prefix}-redis-${replace(var.redis_version, ".", "")}"
  family = "redis${split(".", var.redis_version)[0]}"

  # BullMQ needs keyspace expiry events for delayed and scheduled jobs.
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  # BullMQ requires noeviction. ElastiCache defaults to volatile-lru, which
  # silently drops queued jobs under memory pressure.
  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"
  }
}

# Alphanumeric only, so the token is safe to embed in the connection URL.
resource "random_password" "auth" {
  length  = 32
  special = false
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "${var.name_prefix} Redis (BullMQ + cache)"

  engine                  = "redis"
  engine_version          = var.redis_version
  node_type               = var.node_type
  num_node_groups         = var.num_node_groups
  replicas_per_node_group = var.replicas_per_node_group

  port = 6379

  parameter_group_name = aws_elasticache_parameter_group.this.name
  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [var.security_group_id]

  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true
  auth_token                 = random_password.auth.result
  auth_token_update_strategy = "ROTATE"

  automatic_failover_enabled = var.replicas_per_node_group > 0
  multi_az_enabled           = var.replicas_per_node_group > 0

  snapshot_retention_limit = 7
  snapshot_window          = "05:00-06:00"
  maintenance_window       = "sun:06:30-sun:07:30"

  apply_immediately = false

  tags = { Name = "${var.name_prefix}-redis" }
}

# The app reads a single REDIS_URL, so assemble it here rather than making the
# task definition stitch host, port and token together.
resource "aws_secretsmanager_secret" "url" {
  name                    = "${var.name_prefix}/redis/url"
  recovery_window_in_days = 0
  description             = "rediss:// connection URL for ${aws_elasticache_replication_group.this.replication_group_id}"
}

resource "aws_secretsmanager_secret_version" "url" {
  secret_id = aws_secretsmanager_secret.url.id
  secret_string = format(
    "rediss://:%s@%s:6379",
    random_password.auth.result,
    aws_elasticache_replication_group.this.primary_endpoint_address,
  )
}
