# ── Identity / region ──────────────────────────────────────
variable "project" {
  type    = string
  default = "dashboard"
}

variable "environment" {
  type        = string
  description = "prod, staging, dev"
}

variable "region" {
  type    = string
  default = "us-east-2"
}

# ── VPC ────────────────────────────────────────────────────
variable "vpc_cidr" {
  type    = string
  default = "10.30.0.0/16"
}

variable "azs" {
  type        = list(string)
  description = "Two AZs in var.region. RDS Multi-AZ and the ALB both need two."
  default     = ["us-east-2a", "us-east-2b"]
}

# Egress from private subnets is third-party API calls only (Stripe, Google,
# Microsoft, Bedrock, SES) and S3 already bypasses NAT via the free gateway
# endpoint. A single-AZ NAT outage costs those calls in one AZ, which retries
# absorb. Second NAT is ~$33/mo for that.
variable "single_nat_gateway" {
  type        = bool
  description = "true = one NAT (~$33/mo). false = one per AZ (HA, ~$66/mo)."
  default     = true
}

# Seven interface endpoints x 2 AZ x $0.0126/hr is ~$129/mo, worse than both
# NAT gateways. Only worth it above roughly 2 TB/mo of AWS-API egress.
variable "enable_vpc_endpoints" {
  type        = bool
  description = "Billable interface endpoints for ECR/Secrets/Logs/KMS/SSM. Check the NATGateway BytesOutToDestination metric before enabling."
  default     = false
}

# ── Domain / TLS ───────────────────────────────────────────
variable "domain_name" {
  type        = string
  description = "Apex domain (e.g. refidly.com). Empty = no Route53/ACM, ALB stays HTTP-only."
  default     = ""
}

variable "manage_dns" {
  type        = bool
  description = "Create the Route53 zone, records and ACM certs, and wire HTTPS into the ALB."
  default     = false
}

variable "create_route53_zone" {
  type        = bool
  description = "When manage_dns = true, create the hosted zone. false = use existing_zone_id."
  default     = true
}

variable "existing_zone_id" {
  type    = string
  default = ""
}

variable "external_acm_certificate_arn" {
  type        = string
  description = "Pre-issued regional ACM cert for the ALB. Takes precedence over the dns module."
  default     = ""
}

variable "alb_cloudflare_only" {
  type        = bool
  description = "Restrict ALB ingress to Cloudflare proxy IPv4 ranges. Leave false on Route53 + AWS WAF."
  default     = false
}

# ── WAF ────────────────────────────────────────────────────
variable "enable_waf" {
  type    = bool
  default = true
}

variable "waf_rate_limit_per_5min" {
  type        = number
  description = "Requests from one IP per rolling 5 min before WAF blocks."
  default     = 2000
}

variable "waf_enable_logging" {
  type        = bool
  description = "Ship WAF logs to S3. Destination is S3 rather than CloudWatch Logs: $0.023/GB vs $0.50/GB on the same 7-year retention."
  default     = true
}

# SizeRestrictions_BODY blocks any body over 8 KB and cannot be re-thresholded,
# only demoted to Count. Expense receipts and support attachments clear 8 KB.
variable "waf_managed_rule_excluded_rules" {
  type        = list(string)
  description = "AWSManagedRulesCommonRuleSet rules to Count instead of Block."
  default     = ["SizeRestrictions_BODY"]
}

# Binary multipart bodies (receipt JPEGs, support attachments, org logos) look
# like injection to the CRS/SQLi/KnownBadInputs body rules. Scope those groups
# down so the upload paths skip body inspection; rate limiting and IP
# reputation still apply. AWS requires at least two entries in an or_statement.
variable "waf_body_inspection_exempt_paths" {
  type        = list(string)
  description = "URI prefixes exempt from managed-group body inspection."
  default = [
    "/api/image",
    "/api/expense",
    "/api/support",
    "/api/organization",
    # Stripe payloads carry URLs in the body, which GenericRFI_BODY reads as injection.
    "/api/auth/stripe/webhook",
  ]
}

# ── Redis ──────────────────────────────────────────────────
variable "redis_version" {
  type    = string
  default = "7.1"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "redis_num_node_groups" {
  type    = number
  default = 1
}

variable "redis_replicas_per_node_group" {
  type        = number
  description = "1 = Multi-AZ failover (~$11/mo more). 0 = single node."
  default     = 1
}

# ── Fargate ────────────────────────────────────────────────
variable "api_cpu" {
  type    = number
  default = 512
}

variable "api_memory" {
  type    = number
  default = 1024
}

variable "api_desired_count" {
  type    = number
  default = 2
}

variable "fe_cpu" {
  type    = number
  default = 512
}

variable "fe_memory" {
  type    = number
  default = 1024
}

variable "fe_desired_count" {
  type    = number
  default = 2
}

variable "fe_support_cpu" {
  type    = number
  default = 256
}

variable "fe_support_memory" {
  type    = number
  default = 512
}

variable "fe_support_desired_count" {
  type    = number
  default = 1
}

variable "landing_cpu" {
  type    = number
  default = 256
}

variable "landing_memory" {
  type    = number
  default = 512
}

variable "landing_desired_count" {
  type    = number
  default = 1
}

# FE and support are stateless behind the ALB, Spot gives a 2-minute warning
# and the target group drains. base = 1 keeps one on-demand task per service so
# a Spot capacity crunch cannot empty the target group. The API stays fully
# on-demand: it holds Stripe webhooks, uploads, and socket.io connections.
variable "frontend_spot_weight" {
  type        = number
  description = "FARGATE_SPOT weight for fe and fe-support above the one on-demand base task. 0 disables Spot."
  default     = 3
}

# ARM64 is $0.03238/vCPU-hr vs $0.04048 x86 at the same performance class, but
# every native dependency (Prisma engines, sharp) needs an arm64 build and CI
# must push multi-arch images. Flip this only after a staging service has run
# on arm64 images.
variable "fargate_cpu_architecture" {
  type        = string
  description = "X86_64 or ARM64."
  default     = "X86_64"

  validation {
    condition     = contains(["X86_64", "ARM64"], var.fargate_cpu_architecture)
    error_message = "fargate_cpu_architecture must be X86_64 or ARM64."
  }
}

# Bills per ingested metric and scales with task count. The alerts module
# already alarms on service health from free CloudWatch metrics. Turn this on
# for a week when investigating, then off.
variable "container_insights_enabled" {
  type    = bool
  default = false
}

variable "api_image_tag" {
  type    = string
  default = "latest"
}

variable "fe_image_tag" {
  type    = string
  default = "latest"
}

variable "fe_support_image_tag" {
  type    = string
  default = "latest"
}

variable "landing_image_tag" {
  type    = string
  default = "latest"
}

# ── Autoscaling ────────────────────────────────────────────
variable "enable_autoscaling" {
  type    = bool
  default = true
}

variable "api_min_count" {
  type    = number
  default = 2
}
variable "api_max_count" {
  type    = number
  default = 6
}
variable "fe_min_count" {
  type    = number
  default = 2
}
variable "fe_max_count" {
  type    = number
  default = 4
}
variable "fe_support_min_count" {
  type    = number
  default = 1
}
variable "fe_support_max_count" {
  type    = number
  default = 3
}
variable "landing_min_count" {
  type    = number
  default = 1
}
variable "landing_max_count" {
  type    = number
  default = 3
}

variable "autoscaling_cpu_target" {
  type    = number
  default = 60
}
variable "autoscaling_memory_target" {
  type    = number
  default = 75
}
variable "autoscaling_requests_per_target" {
  type    = number
  default = 800
}
variable "autoscaling_scale_in_cooldown" {
  type    = number
  default = 300
}
variable "autoscaling_scale_out_cooldown" {
  type    = number
  default = 60
}

# ── Uploads bucket ─────────────────────────────────────────
variable "uploads_bucket_name" {
  type        = string
  description = "Globally unique. Defaults to {project}-{env}-uploads-{account_id}."
  default     = ""
}

# image.service.ts sends ServerSideEncryption: AES256 on every PutObject. A
# KMS default on the bucket would reject those calls, so the bucket default
# must stay SSE-S3 until the app is changed to send aws:kms and the task role
# gains kms:GenerateDataKey. Tracked as the open HIPAA item.
variable "uploads_private_expiration_days" {
  type        = number
  description = "Expire objects under private/ after N days. 0 = never."
  default     = 0
}

variable "force_destroy_buckets" {
  type        = bool
  description = "Allow terraform destroy to wipe non-empty buckets. Only when intentionally tearing down."
  default     = false
}

variable "enable_s3_replication" {
  type        = bool
  description = "Cross-region replicate the uploads bucket."
  default     = true
}

variable "replication_region" {
  type    = string
  default = "us-west-2"
}

# ── Backups ────────────────────────────────────────────────
variable "backup_retention_days" {
  type        = number
  description = "Object Lock retention on the DB backup bucket. 2557 = 7y."
  default     = 2557
}

variable "backup_cold_storage_after_days" {
  type    = number
  default = 90
}

# The uploads bucket is already versioned, replicated cross-region and
# lifecycle-tiered. AWS Backup's warm tier costs more per GB than the S3
# storage it duplicates, so this is off unless the risk assessment asks for a
# separate vault copy.
variable "enable_aws_backup" {
  type        = bool
  description = "AWS Backup vault and plan over the uploads bucket."
  default     = false
}

variable "enable_daily_backup" {
  type    = bool
  default = false
}

variable "backup_daily_retention_days" {
  type    = number
  default = 90
}

# ── Logs ───────────────────────────────────────────────────
# HIPAA 164.316(b)(2) requires six years for documentation and audit records,
# not for every line of container stdout. The audit record lives in CloudTrail,
# the AuditLog table, and VPC flow logs — all on audit_log_retention_days.
variable "app_log_retention_days" {
  type        = number
  description = "Retention for ECS container stdout."
  default     = 30
}

variable "audit_log_retention_days" {
  type        = number
  description = "CloudTrail, flow logs, WAF logs. 2557 = 7y."
  default     = 2557
}

# ── Alerts ─────────────────────────────────────────────────
variable "alert_emails" {
  type        = list(string)
  description = "Each address gets an SNS confirmation email after the first apply."
  default     = []
}

# ── SES ────────────────────────────────────────────────────
variable "ses_sending_domain" {
  type        = string
  description = "Domain that outbound mail is sent from. Empty = no SES identity, config set only."
  default     = ""
}

variable "ses_mail_from_subdomain" {
  type        = string
  description = "MAIL FROM subdomain, e.g. mail.refidly.com. Empty = SES default, which leaves SPF unaligned."
  default     = ""
}

variable "enable_ses_inbound" {
  type        = bool
  description = "Inbound receiving for reply logging (EMAIL_INGEST_DOMAIN). Needs a region where SES inbound is available."
  default     = false
}

variable "ses_inbound_domain" {
  type        = string
  description = "Ingest-only subdomain, e.g. in.refidly.com. Never the organization's real mail domain."
  default     = ""
}

# Raw MIME holds PHI and the parsed copy already lives in the database. Long
# enough to cover a failed queue drain, no longer.
variable "ses_inbound_raw_retention_days" {
  type    = number
  default = 7
}

variable "ses_create_receipt_rule_set" {
  type        = bool
  description = "false if an active receipt rule set already exists in this account and region."
  default     = true
}

# ── App config forwarded to the tasks ──────────────────────
variable "app_email" {
  type        = string
  description = "APP_EMAIL — display name and address on outbound mail."
  default     = ""
}

variable "ses_from_email" {
  type        = string
  description = "SES_FROM_EMAIL — must be a verified identity."
  default     = ""
}

variable "email_logo_url" {
  type    = string
  default = ""
}

variable "bedrock_model_id" {
  type    = string
  default = "amazon.nova-micro-v1:0"
}

variable "bedrock_vision_model_id" {
  type    = string
  default = "amazon.nova-lite-v1:0"
}

variable "log_level" {
  type    = string
  default = "info"
}

variable "ai_scrub_phi" {
  type        = string
  description = "\"false\" disables PHI scrubbing before any model call."
  default     = "true"
}

variable "retention_purge_enabled" {
  type        = string
  description = "\"true\" lets the retention job delete rather than report."
  default     = "false"
}

variable "email_open_tracking" {
  type    = string
  default = "true"
}

variable "eldonfax_base_url" {
  type    = string
  default = "https://api.eldonfax.com"
}
