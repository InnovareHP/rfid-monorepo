variable "name_prefix" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_id" { type = string }
variable "kms_key_arn" { type = string }
variable "redis_version" { type = string }
variable "node_type" { type = string }
variable "num_node_groups" { type = number }
variable "replicas_per_node_group" { type = number }
