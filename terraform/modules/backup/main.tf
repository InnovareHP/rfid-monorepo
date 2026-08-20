resource "aws_backup_vault" "this" {
  name        = "${var.name_prefix}-vault"
  kms_key_arn = var.kms_key_arn
}

data "aws_iam_policy_document" "backup_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backup" {
  name               = "${var.name_prefix}-backup"
  assume_role_policy = data.aws_iam_policy_document.backup_assume.json
}

resource "aws_iam_role_policy_attachment" "backup_default" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_s3" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Backup"
}

resource "aws_backup_plan" "this" {
  name = "${var.name_prefix}-plan"

  # Off by default: each daily recovery point is a separately billed warm copy
  # of the whole bucket, and versioning already covers the same window. No cold
  # storage transition — AWS Backup requires
  # (delete_after - cold_storage_after) >= 90, which a daily window cannot meet.
  dynamic "rule" {
    for_each = var.enable_daily_backup ? [1] : []

    content {
      rule_name         = "daily"
      target_vault_name = aws_backup_vault.this.name
      schedule          = "cron(0 5 ? * * *)"

      lifecycle {
        delete_after = var.daily_retention_days
      }
    }
  }

  rule {
    rule_name         = "weekly"
    target_vault_name = aws_backup_vault.this.name
    schedule          = "cron(0 6 ? * SUN *)"

    lifecycle {
      cold_storage_after = (
        var.cold_storage_after_days > 0
        && (var.retention_days - var.cold_storage_after_days) >= 90
        ? var.cold_storage_after_days
        : null
      )
      delete_after = var.retention_days
    }
  }
}

resource "aws_backup_selection" "s3" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.name_prefix}-s3"
  plan_id      = aws_backup_plan.this.id
  resources    = [var.s3_bucket_arn]
}
