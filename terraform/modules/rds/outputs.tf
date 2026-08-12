output "instance_id" { value = aws_db_instance.this.identifier }
output "endpoint" { value = aws_db_instance.this.endpoint }
output "address" { value = aws_db_instance.this.address }
output "database_name" { value = aws_db_instance.this.db_name }
output "database_url_secret_arn" { value = aws_secretsmanager_secret.database_url.arn }

output "tunnel_instance_id" {
  description = "--target for aws ssm start-session. Empty when enable_tunnel = false."
  value       = var.enable_tunnel ? aws_instance.tunnel[0].id : ""
}
