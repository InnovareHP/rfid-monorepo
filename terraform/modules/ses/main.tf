data "aws_caller_identity" "current" {}

locals {
  rule_set_name = "${var.name_prefix}-inbound"
  raw_prefix    = "raw/"
  inbound_on    = var.enable_inbound && var.inbound_domain != ""
}

# ── Outbound ───────────────────────────────────────────────
# app-config.ts requires SES_CONFIGURATION_SET, so the set exists whether or
# not a sending domain is managed here.
resource "aws_sesv2_configuration_set" "outbound" {
  configuration_set_name = "${var.name_prefix}-outbound"

  delivery_options {
    tls_policy = "REQUIRE"
  }

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }
}

resource "aws_sesv2_email_identity" "sending" {
  count          = var.sending_domain != "" ? 1 : 0
  email_identity = var.sending_domain

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}

# REJECT_MESSAGE is deliberate: on a DNS failure the alternative silently falls
# back to amazonses.com, and unaligned mail that looks fine is worse than a
# bounce that says so.
resource "aws_sesv2_email_identity_mail_from_attributes" "sending" {
  count            = var.sending_domain != "" && var.mail_from_subdomain != "" ? 1 : 0
  email_identity   = aws_sesv2_email_identity.sending[0].email_identity
  mail_from_domain = var.mail_from_subdomain

  behavior_on_mx_failure = "REJECT_MESSAGE"
}

# ── Inbound ────────────────────────────────────────────────
# Raw MIME holds PHI and the parsed copy already lives in the database, so the
# bucket expires objects quickly and is never a long-term store.
resource "aws_s3_bucket" "inbound" {
  count         = local.inbound_on ? 1 : 0
  bucket        = "${var.name_prefix}-ses-inbound-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.force_destroy

  tags = { Name = "${var.name_prefix}-ses-inbound" }
}

resource "aws_s3_bucket_public_access_block" "inbound" {
  count                   = local.inbound_on ? 1 : 0
  bucket                  = aws_s3_bucket.inbound[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "inbound" {
  count  = local.inbound_on ? 1 : 0
  bucket = aws_s3_bucket.inbound[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "inbound" {
  count  = local.inbound_on ? 1 : 0
  bucket = aws_s3_bucket.inbound[0].id

  rule {
    id     = "expire-raw-mime"
    status = "Enabled"

    filter {
      prefix = local.raw_prefix
    }

    expiration {
      days = var.raw_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

data "aws_iam_policy_document" "inbound_bucket" {
  count = local.inbound_on ? 1 : 0

  statement {
    sid    = "AllowSESPut"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.inbound[0].arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.inbound[0].arn,
      "${aws_s3_bucket.inbound[0].arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "inbound" {
  count  = local.inbound_on ? 1 : 0
  bucket = aws_s3_bucket.inbound[0].id
  policy = data.aws_iam_policy_document.inbound_bucket[0].json

  depends_on = [aws_s3_bucket_public_access_block.inbound]
}

resource "aws_sns_topic" "inbound" {
  count = local.inbound_on ? 1 : 0
  name  = "${var.name_prefix}-ses-inbound"
}

data "aws_iam_policy_document" "inbound_topic" {
  count = local.inbound_on ? 1 : 0

  statement {
    sid    = "AllowSESPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.inbound[0].arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "inbound" {
  count  = local.inbound_on ? 1 : 0
  arn    = aws_sns_topic.inbound[0].arn
  policy = data.aws_iam_policy_document.inbound_topic[0].json
}

# The controller confirms the subscription on the first SubscriptionConfirmation
# message, but only after the signature verifies. Nothing to do by hand.
resource "aws_sns_topic_subscription" "webhook" {
  count                  = local.inbound_on && var.webhook_url != "" ? 1 : 0
  topic_arn              = aws_sns_topic.inbound[0].arn
  protocol               = "https"
  endpoint               = var.webhook_url
  endpoint_auto_confirms = true
}

resource "aws_ses_domain_identity" "inbound" {
  count  = local.inbound_on ? 1 : 0
  domain = var.inbound_domain
}

resource "aws_ses_domain_dkim" "inbound" {
  count  = local.inbound_on ? 1 : 0
  domain = aws_ses_domain_identity.inbound[0].domain
}

# Only one receipt rule set can be active per account and region.
resource "aws_ses_receipt_rule_set" "inbound" {
  count         = local.inbound_on && var.create_receipt_rule_set ? 1 : 0
  rule_set_name = local.rule_set_name
}

resource "aws_ses_active_receipt_rule_set" "inbound" {
  count         = local.inbound_on && var.create_receipt_rule_set ? 1 : 0
  rule_set_name = aws_ses_receipt_rule_set.inbound[0].rule_set_name
}

resource "aws_ses_receipt_rule" "store_and_notify" {
  count         = local.inbound_on && var.create_receipt_rule_set ? 1 : 0
  name          = "${var.name_prefix}-store-and-notify"
  rule_set_name = aws_ses_receipt_rule_set.inbound[0].rule_set_name
  recipients    = [var.inbound_domain]
  enabled       = true
  scan_enabled  = true
  tls_policy    = "Require"

  s3_action {
    bucket_name       = aws_s3_bucket.inbound[0].id
    object_key_prefix = local.raw_prefix
    topic_arn         = aws_sns_topic.inbound[0].arn
    position          = 1
  }

  depends_on = [aws_s3_bucket_policy.inbound]
}
