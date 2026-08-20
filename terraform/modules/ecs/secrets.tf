# Terraform manages the container, not the values. Populate them once after the
# first apply with `aws secretsmanager put-secret-value`, then never again from
# here — ignore_changes keeps a later apply from reverting real values to the
# placeholder.
#
# DATABASE_URL and REDIS_URL are deliberately absent: they are generated and
# owned by the rds and redis modules and injected from their own secrets.

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.name_prefix}/app"
  kms_key_id              = var.secrets_kms_key_arn
  recovery_window_in_days = 0
  description             = "App secrets consumed by the API task. Keys match apps/api/src/config/app-config.ts."
}

resource "aws_secretsmanager_secret_version" "app_placeholder" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
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
    ELDONFAX_API_KEY             = "REPLACE_ME"
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
