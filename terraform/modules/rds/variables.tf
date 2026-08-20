variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_sg_id" { type = string }
variable "kms_key_arn" { type = string }
variable "secrets_kms_key_arn" { type = string }

variable "instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "engine_version" {
  type    = string
  default = "16"
}

variable "database_name" {
  type    = string
  default = "dashboard"
}

variable "master_username" {
  type    = string
  default = "dashboard"
}

variable "allocated_storage" {
  type    = number
  default = 50
}

variable "max_allocated_storage" {
  type    = number
  default = 500
}

variable "multi_az" {
  type    = bool
  default = true
}

variable "backup_retention_period" {
  type    = number
  default = 35
}

variable "publicly_accessible" {
  type    = bool
  default = false
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "logs_kms_key_arn" {
  type    = string
  default = null
}

variable "enable_tunnel" {
  type    = bool
  default = true
}

variable "tunnel_instance_type" {
  type    = string
  default = "t4g.nano"
}

variable "tunnel_subnet_id" {
  type    = string
  default = ""
}

variable "tunnel_security_group_id" {
  type    = string
  default = ""
}
