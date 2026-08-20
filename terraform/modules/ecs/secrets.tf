# Terraform manages the container, not the values. Populate them once after the
# first apply with `aws secretsmanager put-secret-value`, then never again from
# here — ignore_changes keeps a later apply from reverting real values to the
# placeholder.
#
# DATABASE_URL lives here rather than its own secret so its ARN never changes
# across a database migration (e.g. RDS -> Neon) — a stable ARN means a stale
# CI-registered task definition revision still resolves correctly. REDIS_URL
# is still generated and owned by the redis module, injected from its own secret.
#
# ELDONFAX_API_KEY is optional in app-config.ts and deliberately absent: ECS
# requires a JSON-key secret reference to exist at container launch, so listing
# an optional key here would make it required at the infra layer anyway.

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.name_prefix}/app"
  kms_key_id              = var.secrets_kms_key_arn
  recovery_window_in_days = 0
  description             = "App secrets consumed by the API task. Keys match apps/api/src/config/app-config.ts."
}

resource "aws_secretsmanager_secret_version" "app_placeholder" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL                 = "REPLACE_ME"
    JWT_SECRET                   = "REPLACE_ME"
    BETTER_AUTH_SECRET           = "REPLACE_ME"
    ENCRYPTION_KEY               = "REPLACE_ME"
    AUDIT_HMAC_KEY               = "REPLACE_ME"
    GOOGLE_CLIENT_ID             = "REPLACE_ME"
    GOOGLE_CLIENT_SECRET         = "REPLACE_ME"
    MICROSOFT_CLIENT_ID          = "REPLACE_ME"
    MICROSOFT_CLIENT_SECRET      = "REPLACE_ME"
    STRIPE_SECRET_KEY            = "REPLACE_ME"
    STRIPE_WEBHOOK_SECRET        = "REPLACE_ME"
    STRIPE_PRICE_ESSENTIALS_SEAT = "REPLACE_ME"
    STRIPE_PRICE_GROWTH_SEAT     = "REPLACE_ME"
    STRIPE_PRICE_SCALE_SEAT      = "REPLACE_ME"
    # app-config.ts marks both as required, so the container will not boot
    # without them. Removing that requirement lets the Fargate task role supply
    # credentials through IMDS and drops these two long-lived keys entirely —
    # see docs/terraform-infrastructure.md.
    AWS_ACCESS_KEY_ID     = "REPLACE_ME"
    AWS_SECRET_ACCESS_KEY = "REPLACE_ME"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
