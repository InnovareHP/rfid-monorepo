# The free S3 gateway endpoint lives in the vpc module so it exists even when
# this module is off. Only billable interface endpoints belong here: roughly
# $7/mo each per subnet, so six services across two private subnets is ~$88/mo.
# Cheaper than NAT only above roughly 2 TB/mo of egress — check the
# NATGateway BytesOutToDestination metric before enabling.
locals {
  interface_services = [
    "ecr.api",
    "ecr.dkr",
    "secretsmanager",
    "logs",
    "kms",
    "ssm",
  ]
}

resource "aws_vpc_endpoint" "interfaces" {
  for_each = toset(local.interface_services)

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [var.endpoint_sg_id]
  private_dns_enabled = true

  tags = { Name = "${var.name_prefix}-${each.key}-vpce" }
}
