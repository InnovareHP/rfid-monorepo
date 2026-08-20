output "web_acl_arn" { value = aws_wafv2_web_acl.this.arn }
output "web_acl_id" { value = aws_wafv2_web_acl.this.id }

output "log_bucket" {
  description = "S3 bucket receiving WAF logs. Empty when logging is off."
  value       = var.enable_logging ? aws_s3_bucket.logs[0].bucket : ""
}
