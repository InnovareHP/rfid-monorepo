output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecr_repository_urls" {
  description = "Push targets for CI, keyed by service."
  value       = module.ecs.ecr_repository_urls
}

# ── DNS / TLS ─────────────────────────────────────────────
output "dns_name_servers" {
  description = "Set these as the NS records at the registrar."
  value       = try(module.dns[0].name_servers, [])
}

output "alb_certificate_arn" {
  value = try(module.dns[0].alb_certificate_arn, "")
}

output "cloudfront_certificate_arn" {
  value = try(module.dns[0].cloudfront_certificate_arn, "")
}

# ── Database ──────────────────────────────────────────────
output "db_endpoint" {
  description = "Private RDS endpoint. Not reachable from outside the VPC."
  value       = module.rds.endpoint
}

output "database_url_secret_arn" {
  description = "Secrets Manager entry holding the full postgresql:// URL."
  value       = module.rds.database_url_secret_arn
}

output "db_tunnel_instance_id" {
  description = "--target for aws ssm start-session."
  value       = module.rds.tunnel_instance_id
}

# Copy-paste command that yields a localhost connection URL. sslmode=require
# rather than verify-full: through a localhost tunnel the RDS certificate CN
# will never match localhost.
output "db_tunnel_command" {
  description = "Open the port-forward, then connect to postgresql://<user>:<pw>@localhost:5432/<db>?sslmode=require"
  value = var.enable_db_tunnel ? join(" ", [
    "aws ssm start-session",
    "--target ${module.rds.tunnel_instance_id}",
    "--document-name AWS-StartPortForwardingSessionToRemoteHost",
    "--parameters '{\"host\":[\"${module.rds.address}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5432\"]}'",
  ]) : ""
}

# ── Data layer ────────────────────────────────────────────
output "redis_primary_endpoint" {
  value     = module.redis.primary_endpoint
  sensitive = true
}

output "redis_url_secret_arn" {
  value = module.redis.url_secret_arn
}

# ── Storage ───────────────────────────────────────────────
output "uploads_bucket" {
  description = "S3_UPLOADS_BUCKET."
  value       = module.uploads.bucket_name
}

output "uploads_public_base_url" {
  description = "S3_PUBLIC_BASE_URL. CloudFront serves public/ only."
  value       = module.uploads.public_cdn_url
}

output "uploads_distribution_id" {
  value = module.uploads.distribution_id
}

output "db_backup_bucket" {
  description = "WORM bucket for pg_dump archives. DB_BACKUP_BUCKET."
  value       = module.db_backup.bucket_name
}

# ── Landing site ──────────────────────────────────────────
output "landing_bucket" {
  description = "Sync apps/landing/dist here, then invalidate the distribution."
  value       = module.landing_site.bucket_name
}

output "landing_distribution_id" {
  value = module.landing_site.distribution_id
}

output "landing_url" {
  value = module.landing_site.url
}

# ── App secrets ───────────────────────────────────────────
output "app_secrets_arn" {
  description = "Populate the REPLACE_ME values once, by hand or from CI."
  value       = module.ecs.app_secrets_arn
}

# ── Alerts ────────────────────────────────────────────────
output "alerts_topic_arn" {
  description = "Email subscriptions need confirming after the first apply."
  value       = module.alerts.topic_arn
}

# ── WAF ───────────────────────────────────────────────────
output "waf_web_acl_arn" {
  value = try(module.waf[0].web_acl_arn, "")
}

output "waf_log_bucket" {
  value = try(module.waf[0].log_bucket, "")
}

# ── SES ───────────────────────────────────────────────────
output "ses_configuration_set" {
  description = "SES_CONFIGURATION_SET."
  value       = module.ses.outbound_configuration_set_name
}

output "ses_sending_dkim_records" {
  description = "CNAMEs to publish for the sending domain."
  value = [
    for tok in module.ses.sending_dkim_tokens : {
      name  = "${tok}._domainkey.${var.ses_sending_domain}"
      value = "${tok}.dkim.amazonses.com"
    }
  ]
}

output "ses_inbound_dns_records" {
  description = "Verification TXT, DKIM CNAMEs and MX for the ingest domain."
  value = var.enable_ses_inbound && var.ses_inbound_domain != "" ? {
    verification_txt = {
      name  = "_amazonses.${var.ses_inbound_domain}"
      value = module.ses.inbound_verification_token
    }
    dkim_cnames = [
      for tok in module.ses.inbound_dkim_tokens : {
        name  = "${tok}._domainkey.${var.ses_inbound_domain}"
        value = "${tok}.dkim.amazonses.com"
      }
    ]
    mx = {
      name  = var.ses_inbound_domain
      value = module.ses.inbound_mx_target
    }
  } : null
}

output "ses_inbound_bucket" {
  description = "SES_INBOUND_BUCKET."
  value       = module.ses.inbound_bucket_name
}

output "ses_inbound_topic_arn" {
  description = "SES_INBOUND_TOPIC_ARN."
  value       = module.ses.inbound_topic_arn
}
