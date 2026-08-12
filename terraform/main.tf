data "aws_caller_identity" "current" {}

locals {
  name_prefix = "${var.project}-${var.environment}"
  account_id  = data.aws_caller_identity.current.account_id

  fqdn_app     = var.domain_name != "" ? "app.${var.domain_name}" : ""
  fqdn_api     = var.domain_name != "" ? "api.${var.domain_name}" : ""
  fqdn_support = var.domain_name != "" ? "support.${var.domain_name}" : ""
  fqdn_www     = var.domain_name != "" ? "www.${var.domain_name}" : ""

  uploads_bucket = (
    var.uploads_bucket_name != ""
    ? var.uploads_bucket_name
    : "${local.name_prefix}-uploads-${local.account_id}"
  )

  landing_bucket = (
    var.landing_bucket_name != ""
    ? var.landing_bucket_name
    : "${local.name_prefix}-landing-${local.account_id}"
  )

  db_backup_bucket = "${local.name_prefix}-db-backups-${local.account_id}"

  # Both inputs are known at plan time, unlike the cert ARN itself which may be
  # computed. Listener counts must not depend on an unknown value.
  https_enabled = var.external_acm_certificate_arn != "" || var.manage_dns
}

module "kms" {
  source      = "./modules/kms"
  name_prefix = local.name_prefix
}

module "vpc" {
  source                  = "./modules/vpc"
  name_prefix             = local.name_prefix
  region                  = var.region
  vpc_cidr                = var.vpc_cidr
  azs                     = var.azs
  single_nat_gateway      = var.single_nat_gateway
  force_destroy           = var.force_destroy_buckets
  flow_log_retention_days = var.audit_log_retention_days
}

module "security" {
  source              = "./modules/security"
  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  alb_cloudflare_only = var.alb_cloudflare_only
}

module "uploads" {
  source = "./modules/uploads"

  bucket_name             = local.uploads_bucket
  force_destroy           = var.force_destroy_buckets
  private_expiration_days = var.uploads_private_expiration_days

  enable_replication                 = var.enable_s3_replication
  replication_role_arn               = var.enable_s3_replication ? module.s3_replication[0].replication_role_arn : ""
  replication_destination_bucket_arn = var.enable_s3_replication ? module.s3_replication[0].replica_bucket_arn : ""
}

module "s3_replication" {
  source = "./modules/s3_replication"
  count  = var.enable_s3_replication ? 1 : 0

  providers = {
    aws.replica = aws.replica
  }

  name_prefix        = local.name_prefix
  source_bucket_name = local.uploads_bucket
  source_bucket_arn  = module.uploads.bucket_arn
  replica_region     = var.replication_region
  force_destroy      = var.force_destroy_buckets
}

module "db_backup" {
  source = "./modules/db_backup"

  bucket_name             = local.db_backup_bucket
  kms_key_arn             = module.kms.s3_key_arn
  retention_days          = var.backup_retention_days
  cold_storage_after_days = var.backup_cold_storage_after_days
  force_destroy           = var.force_destroy_buckets
}

module "rds" {
  source = "./modules/rds"

  name_prefix              = local.name_prefix
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  db_sg_id                 = module.security.db_sg_id
  kms_key_arn              = module.kms.db_key_arn
  secrets_kms_key_arn      = module.kms.secrets_key_arn
  instance_class           = var.db_instance_class
  engine_version           = var.db_engine_version
  allocated_storage        = var.db_allocated_storage
  max_allocated_storage    = var.db_max_allocated_storage
  multi_az                 = var.db_multi_az
  backup_retention_period  = var.db_backup_retention_period
  publicly_accessible      = var.db_publicly_accessible
  log_retention_days       = var.app_log_retention_days
  logs_kms_key_arn         = module.kms.logs_key_arn
  enable_tunnel            = var.enable_db_tunnel
  tunnel_instance_type     = var.db_tunnel_instance_type
  tunnel_subnet_id         = module.vpc.private_subnet_ids[0]
  tunnel_security_group_id = module.security.db_tunnel_sg_id
}

module "redis" {
  source = "./modules/redis"

  name_prefix             = local.name_prefix
  subnet_ids              = module.vpc.private_subnet_ids
  security_group_id       = module.security.redis_sg_id
  kms_key_arn             = module.kms.redis_key_arn
  redis_version           = var.redis_version
  node_type               = var.redis_node_type
  num_node_groups         = var.redis_num_node_groups
  replicas_per_node_group = var.redis_replicas_per_node_group
}

module "dns" {
  source = "./modules/dns"
  count  = var.manage_dns ? 1 : 0

  providers = {
    aws.us_east_1 = aws.us_east_1
  }

  domain_name      = var.domain_name
  create_zone      = var.create_route53_zone
  existing_zone_id = var.existing_zone_id

  # app -> fe, api -> api, support -> fe-support. Apex and www are alias
  # records on the landing CloudFront distribution and are created by the
  # landing_site module instead.
  alb_subdomains = ["app", "api", "support"]
  alb_dns_name   = module.ecs.alb_dns_name
  alb_zone_id    = module.ecs.alb_zone_id
}

module "landing_site" {
  source = "./modules/landing_site"

  bucket_name   = local.landing_bucket
  force_destroy = var.force_destroy_buckets
  price_class   = var.landing_price_class

  # Apex plus www only once DNS and the us-east-1 cert exist; before that the
  # distribution serves on its own *.cloudfront.net domain.
  enable_custom_domain = var.manage_dns && var.domain_name != ""
  aliases              = var.manage_dns && var.domain_name != "" ? [var.domain_name, local.fqdn_www] : []
  acm_certificate_arn  = var.manage_dns ? module.dns[0].cloudfront_certificate_arn : ""
  route53_zone_id      = var.manage_dns ? module.dns[0].zone_id : ""
}

module "ecs" {
  source = "./modules/ecs"

  name_prefix        = local.name_prefix
  region             = var.region
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  alb_sg_id          = module.security.alb_sg_id
  ecs_sg_id          = module.security.ecs_sg_id

  logs_kms_key_arn    = module.kms.logs_key_arn
  secrets_kms_key_arn = module.kms.secrets_key_arn

  uploads_bucket         = module.uploads.bucket_name
  uploads_bucket_arn     = module.uploads.bucket_arn
  uploads_public_cdn_url = module.uploads.public_cdn_url
  db_backup_bucket       = module.db_backup.bucket_name
  db_backup_bucket_arn   = module.db_backup.bucket_arn
  s3_kms_key_arn         = module.kms.s3_key_arn

  database_url_secret_arn = module.rds.database_url_secret_arn
  redis_url_secret_arn    = module.redis.url_secret_arn

  api_cpu                  = var.api_cpu
  api_memory               = var.api_memory
  api_desired_count        = var.api_desired_count
  fe_cpu                   = var.fe_cpu
  fe_memory                = var.fe_memory
  fe_desired_count         = var.fe_desired_count
  fe_support_cpu           = var.fe_support_cpu
  fe_support_memory        = var.fe_support_memory
  fe_support_desired_count = var.fe_support_desired_count
  frontend_spot_weight     = var.frontend_spot_weight
  cpu_architecture         = var.fargate_cpu_architecture

  api_image_tag        = var.api_image_tag
  fe_image_tag         = var.fe_image_tag
  fe_support_image_tag = var.fe_support_image_tag

  log_retention_days         = var.app_log_retention_days
  container_insights_enabled = var.container_insights_enabled

  enable_autoscaling              = var.enable_autoscaling
  api_min_count                   = var.api_min_count
  api_max_count                   = var.api_max_count
  fe_min_count                    = var.fe_min_count
  fe_max_count                    = var.fe_max_count
  fe_support_min_count            = var.fe_support_min_count
  fe_support_max_count            = var.fe_support_max_count
  autoscaling_cpu_target          = var.autoscaling_cpu_target
  autoscaling_memory_target       = var.autoscaling_memory_target
  autoscaling_requests_per_target = var.autoscaling_requests_per_target
  autoscaling_scale_in_cooldown   = var.autoscaling_scale_in_cooldown
  autoscaling_scale_out_cooldown  = var.autoscaling_scale_out_cooldown

  acm_certificate_arn = (
    var.external_acm_certificate_arn != "" ? var.external_acm_certificate_arn :
    var.manage_dns ? module.dns[0].alb_certificate_arn : ""
  )
  enable_https = local.https_enabled

  app_hostname     = local.fqdn_app
  api_hostname     = local.fqdn_api
  support_hostname = local.fqdn_support

  app_email               = var.app_email
  ses_from_email          = var.ses_from_email
  ses_configuration_set   = module.ses.outbound_configuration_set_name
  ses_inbound_bucket      = module.ses.inbound_bucket_name
  ses_inbound_bucket_arn  = module.ses.inbound_bucket_arn
  ses_inbound_topic_arn   = module.ses.inbound_topic_arn
  email_ingest_domain     = var.ses_inbound_domain
  email_logo_url          = var.email_logo_url
  bedrock_model_id        = var.bedrock_model_id
  bedrock_vision_model_id = var.bedrock_vision_model_id
  log_level               = var.log_level
  ai_scrub_phi            = var.ai_scrub_phi
  retention_purge_enabled = var.retention_purge_enabled
  email_open_tracking     = var.email_open_tracking
  eldonfax_base_url       = var.eldonfax_base_url
}

module "ses" {
  source = "./modules/ses"

  name_prefix             = local.name_prefix
  region                  = var.region
  sending_domain          = var.ses_sending_domain
  enable_inbound          = var.enable_ses_inbound
  inbound_domain          = var.ses_inbound_domain
  raw_retention_days      = var.ses_inbound_raw_retention_days
  create_receipt_rule_set = var.ses_create_receipt_rule_set
  kms_key_arn             = module.kms.s3_key_arn
  force_destroy           = var.force_destroy_buckets
  webhook_url = (
    local.fqdn_api != "" ? "https://${local.fqdn_api}/api/email/inbound/sns" : ""
  )
}

module "waf" {
  source = "./modules/waf"
  count  = var.enable_waf ? 1 : 0

  name_prefix                  = local.name_prefix
  alb_arn                      = module.ecs.alb_arn
  rate_limit_per_5min          = var.waf_rate_limit_per_5min
  enable_logging               = var.waf_enable_logging
  log_retention_days           = var.audit_log_retention_days
  managed_rule_excluded_rules  = var.waf_managed_rule_excluded_rules
  body_inspection_exempt_paths = var.waf_body_inspection_exempt_paths
  force_destroy                = var.force_destroy_buckets
}

module "vpc_endpoints" {
  source = "./modules/vpc_endpoints"
  count  = var.enable_vpc_endpoints ? 1 : 0

  name_prefix        = local.name_prefix
  region             = var.region
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  endpoint_sg_id     = module.security.ecs_sg_id
}

module "backup" {
  source = "./modules/backup"
  count  = var.enable_aws_backup ? 1 : 0

  name_prefix             = local.name_prefix
  kms_key_arn             = module.kms.s3_key_arn
  s3_bucket_arn           = module.uploads.bucket_arn
  retention_days          = var.backup_retention_days
  enable_daily_backup     = var.enable_daily_backup
  daily_retention_days    = var.backup_daily_retention_days
  cold_storage_after_days = var.backup_cold_storage_after_days
}

module "cloudtrail" {
  source = "./modules/cloudtrail"

  name_prefix              = local.name_prefix
  kms_key_arn              = module.kms.logs_key_arn
  audit_log_retention_days = var.audit_log_retention_days
  force_destroy            = var.force_destroy_buckets
}

module "alerts" {
  source = "./modules/alerts"

  name_prefix       = local.name_prefix
  kms_key_arn       = module.kms.logs_key_arn
  alert_emails      = var.alert_emails
  backup_vault_name = var.enable_aws_backup ? module.backup[0].vault_name : ""

  source_bucket_name  = var.enable_s3_replication ? module.uploads.bucket_name : ""
  replication_rule_id = "uploads-crr"

  db_instance_id = module.rds.instance_id

  container_insights_enabled = var.container_insights_enabled
  ecs_cluster_name           = module.ecs.cluster_name
  ecs_services_to_watch = [
    "${local.name_prefix}-api",
    "${local.name_prefix}-fe",
    "${local.name_prefix}-fe-support",
  ]
}
