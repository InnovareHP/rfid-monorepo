output "bucket_name" { value = aws_s3_bucket.this.bucket }
output "bucket_arn" { value = aws_s3_bucket.this.arn }
output "distribution_id" { value = aws_cloudfront_distribution.this.id }

# S3_PUBLIC_BASE_URL. The app appends the full key, so public/<scope>/<file>
# resolves to the same key in the bucket. No trailing slash.
output "public_cdn_url" {
  value = "https://${aws_cloudfront_distribution.this.domain_name}"
}
