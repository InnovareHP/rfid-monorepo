output "outbound_configuration_set_name" {
  value = aws_sesv2_configuration_set.outbound.configuration_set_name
}

output "sending_dkim_tokens" {
  description = "CNAME <token>._domainkey.<domain> -> <token>.dkim.amazonses.com"
  value       = var.sending_domain != "" ? aws_sesv2_email_identity.sending[0].dkim_signing_attributes[0].tokens : []
}

output "inbound_bucket_name" {
  value = local.inbound_on ? aws_s3_bucket.inbound[0].bucket : ""
}

output "inbound_bucket_arn" {
  value = local.inbound_on ? aws_s3_bucket.inbound[0].arn : ""
}

output "inbound_topic_arn" {
  value = local.inbound_on ? aws_sns_topic.inbound[0].arn : ""
}

output "inbound_raw_prefix" {
  value = local.inbound_on ? local.raw_prefix : ""
}

output "inbound_verification_token" {
  value = local.inbound_on ? aws_ses_domain_identity.inbound[0].verification_token : ""
}

output "inbound_dkim_tokens" {
  value = local.inbound_on ? aws_ses_domain_dkim.inbound[0].dkim_tokens : []
}

output "inbound_mx_target" {
  description = "MX record value for the ingest domain, priority 10."
  value       = local.inbound_on ? "inbound-smtp.${var.region}.amazonaws.com" : ""
}
