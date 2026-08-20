resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "${var.name_prefix}-db" }
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name_prefix}-pg${var.engine_version}"
  family = "postgres${var.engine_version}"

  # Reject non-TLS connections at the engine, not just at the client. Static
  # parameter, so it takes effect at instance creation.
  parameter {
    name         = "rds.force_ssl"
    value        = "1"
    apply_method = "pending-reboot"
  }

  # Statements slower than a second land in the postgres log. Anything lower
  # logs query text at volume, and query text on this database contains PHI.
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "random_password" "master" {
  length  = 40
  special = false
}

# Retention on the exported postgres log has to exist before the instance
# creates the group, or it defaults to never expiring.
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/instance/${var.name_prefix}-pg/postgresql"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.logs_kms_key_arn
}

resource "aws_db_instance" "this" {
  identifier     = "${var.name_prefix}-pg"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  parameter_group_name   = aws_db_parameter_group.this.name
  vpc_security_group_ids = [var.db_sg_id]
  publicly_accessible    = var.publicly_accessible
  port                   = 5432

  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  backup_window           = "07:00-08:00"
  maintenance_window      = "sun:08:30-sun:09:30"
  copy_tags_to_snapshot   = true

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name_prefix}-pg-final"

  auto_minor_version_upgrade = true

  # Performance Insights bills past 7 days of retention. The exported postgres
  # log plus CloudTrail already cover the audit requirement.
  performance_insights_enabled    = false
  enabled_cloudwatch_logs_exports = ["postgresql"]

  depends_on = [aws_cloudwatch_log_group.postgresql]

  tags = { Name = "${var.name_prefix}-pg" }
}

# DATABASE_URL is fully managed here rather than pasted into the app secret by
# hand. The ECS task definition pulls this ARN directly, so a password rotation
# is a Terraform apply and a service restart, not a manual edit.
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.name_prefix}/db/url"
  kms_key_id              = var.secrets_kms_key_arn
  recovery_window_in_days = 0
  description             = "Postgres connection URL for ${aws_db_instance.this.identifier}"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = format(
    "postgresql://%s:%s@%s/%s?sslmode=require",
    aws_db_instance.this.username,
    random_password.master.result,
    aws_db_instance.this.endpoint,
    aws_db_instance.this.db_name,
  )
}

# ── SSM port-forward host ──────────────────────────────────
# A laptop reaches the private instance with
# `aws ssm start-session --document-name AWS-StartPortForwardingSessionToRemoteHost`,
# which yields a localhost:5432 connection URL for psql or any GUI client. No
# bastion in the request path, no SSH key, no inbound rule, and every session
# is recorded in CloudTrail.
data "aws_ssm_parameter" "al2023_arm64" {
  count = var.enable_tunnel ? 1 : 0
  name  = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

data "aws_iam_policy_document" "tunnel_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "tunnel" {
  count              = var.enable_tunnel ? 1 : 0
  name               = "${var.name_prefix}-db-tunnel"
  assume_role_policy = data.aws_iam_policy_document.tunnel_assume.json
}

resource "aws_iam_role_policy_attachment" "tunnel_ssm" {
  count      = var.enable_tunnel ? 1 : 0
  role       = aws_iam_role.tunnel[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "tunnel" {
  count = var.enable_tunnel ? 1 : 0
  name  = "${var.name_prefix}-db-tunnel"
  role  = aws_iam_role.tunnel[0].name
}

resource "aws_instance" "tunnel" {
  count                  = var.enable_tunnel ? 1 : 0
  ami                    = data.aws_ssm_parameter.al2023_arm64[0].value
  instance_type          = var.tunnel_instance_type
  subnet_id              = var.tunnel_subnet_id
  vpc_security_group_ids = [var.tunnel_security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.tunnel[0].name

  # Private subnet, no public IP. The SSM agent dials out through the NAT.
  associate_public_ip_address = false

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tags = { Name = "${var.name_prefix}-db-tunnel" }
}
