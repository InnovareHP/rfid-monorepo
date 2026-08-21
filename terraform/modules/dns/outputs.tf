output "zone_id" {
  value = local.zone_id
}

output "name_servers" {
  description = "Set these as the NS records at the registrar."
  value       = var.create_zone ? aws_route53_zone.this[0].name_servers : []
}

output "alb_certificate_arn" {
  value = aws_acm_certificate_validation.alb.certificate_arn
}

output "subdomain_fqdns" {
  value = [for r in aws_route53_record.alb_subdomain : r.fqdn]
}
