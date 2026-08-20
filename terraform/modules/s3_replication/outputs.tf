output "replica_bucket_name" { value = aws_s3_bucket.replica.bucket }
output "replica_bucket_arn" { value = aws_s3_bucket.replica.arn }
output "replication_role_arn" { value = aws_iam_role.replication.arn }
