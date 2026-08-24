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

output "gha_deploy_role_arn" {
  description = "role-to-assume for the deploy.yml GitHub Actions workflow."
  value       = module.ci.deploy_role_arn
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
# Postgres is Neon, not self-hosted. DATABASE_URL is a key in the app_secrets_arn
# secret (see below), set via console/CLI, not terraform.

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
