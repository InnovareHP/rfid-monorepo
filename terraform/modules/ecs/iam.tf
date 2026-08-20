data "aws_caller_identity" "current" {}

# The Redis URL secret is created without an explicit key, so it sits on the
# AWS-managed Secrets Manager key rather than the customer-managed one.
data "aws_kms_alias" "aws_secretsmanager" {
  name = "alias/aws/secretsmanager"
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Execution role: pulls images, writes logs, resolves secrets at task start.
resource "aws_iam_role" "execution" {
  name               = "${var.name_prefix}-ecs-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = compact([
      aws_secretsmanager_secret.app.arn,
      var.database_url_secret_arn,
      var.redis_url_secret_arn,
    ])
  }

  statement {
    actions = ["kms:Decrypt"]
    resources = compact([
      var.secrets_kms_key_arn,
      data.aws_kms_alias.aws_secretsmanager.target_key_arn,
    ])
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${var.name_prefix}-ecs-exec-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# Task role: what the running container may do.
resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "task_perms" {
  statement {
    sid = "UploadsBucketRW"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:GetObjectVersion",
    ]
    resources = [
      var.uploads_bucket_arn,
      "${var.uploads_bucket_arn}/*",
    ]
  }

  # Object Lock forbids early delete anyway, so DeleteObject is omitted rather
  # than granted and ignored. PutObjectRetention sets the per-object hold.
  statement {
    sid = "DbBackupBucketRW"
    actions = [
      "s3:PutObject",
      "s3:PutObjectRetention",
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:ListBucket",
      "s3:GetBucketObjectLockConfiguration",
    ]
    resources = [
      var.db_backup_bucket_arn,
      "${var.db_backup_bucket_arn}/*",
    ]
  }

  statement {
    sid = "DbBackupKms"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]
    resources = [var.s3_kms_key_arn]
  }

  # Raw MIME for the reply-ingest pipeline. Read and delete only; SES writes.
  dynamic "statement" {
    for_each = var.ses_inbound_bucket_arn != "" ? [1] : []
    content {
      sid = "SesInboundRead"
      actions = [
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
      ]
      resources = [
        var.ses_inbound_bucket_arn,
        "${var.ses_inbound_bucket_arn}/*",
      ]
    }
  }

  # lib/aws/bedrock.ts uses ConverseCommand only, which maps to InvokeModel.
  # Scoped to the two configured models rather than the whole catalogue.
  statement {
    sid     = "BedrockInvoke"
    actions = ["bedrock:InvokeModel"]
    resources = [
      "arn:aws:bedrock:${var.region}::foundation-model/${var.bedrock_model_id}",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.bedrock_vision_model_id}",
    ]
  }

  # SESv2 SendEmail with Content.Raw maps to the ses:SendRawEmail action.
  statement {
    sid     = "SesSend"
    actions = ["ses:SendRawEmail", "ses:SendEmail"]
    resources = [
      "arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:identity/*",
      "arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:configuration-set/*",
    ]
  }

  # geo-places actions are not resource scoped. Map tiles are fetched in the
  # browser with a separate referer-restricted API key, so no geo-maps here.
  statement {
    sid = "GeoPlaces"
    actions = [
      "geo-places:Autocomplete",
      "geo-places:GetPlace",
      "geo-places:Geocode",
    ]
    resources = ["*"]
  }

  # `aws ecs execute-command` opens its channels using the task role. Needed to
  # run prisma migrate from inside the VPC now that Postgres is private.
  statement {
    sid = "EcsExecSsmChannels"
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task" {
  name   = "${var.name_prefix}-ecs-task-perms"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task_perms.json
}
