# State bucket must exist before the first init. use_lockfile replaces the
# DynamoDB lock table and needs Terraform >= 1.10.
terraform {
  backend "s3" {
    bucket       = "refidly-tfstate"
    key          = "dashboard/aws/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    kms_key_id   = "alias/aws/s3"
    use_lockfile = true
  }
}
