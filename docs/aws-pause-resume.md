# AWS pause / resume (dashboard, us-east-2)

Ported from the vault note `Innovare Brain/wiki/concepts/aws-pause-resume.md` (fax app, us-east-1) to this stack (`dashboard-prod-*`, us-east-2). Script: `terraform/scripts/pause-stack.sh`.

Pause is a targeted destroy, resume is a normal full apply. Nothing is removed from config. Redis is the only state config cannot rebuild, so it is snapshotted before pause and seeded back on resume through `redis_restore_snapshot`.

## Destroyed on pause

| Target | Cascades |
| --- | --- |
| `module.vpc.aws_nat_gateway.this`, `module.vpc.aws_eip.nat` | private NAT routes |
| `module.ecs.aws_lb.this` | listeners, listener rules, WAF association |
| `module.ecs.aws_ecs_service.{api,fe,fe_support,landing}` | autoscaling targets and policies |
| `module.redis.aws_elasticache_replication_group.this` | Redis URL secret + version, task definitions, execution secrets policy |
| `module.waf[0].aws_wafv2_web_acl.this` | WAF logging config |
| `module.vpc_endpoints[0].aws_vpc_endpoint.interfaces` | only when `enable_vpc_endpoints` |
| `module.alerts` `ecs_tasks_low`, `ecs_service_silent` | would page every 15 min while paused |

Kept: VPC, subnets, S3, KMS, Secrets Manager (app secret), ECR, ECS cluster, CloudTrail, SES, AWS Backup, ACM, IAM. Postgres is outside terraform.

## Commands (Git Bash, prod AWS creds)

```bash
cd terraform
./scripts/pause-stack.sh status   # NAT, ALB, Redis, ECS service count, last snapshot
./scripts/pause-stack.sh plan     # destroy plan only
./scripts/pause-stack.sh pause    # plan, type PAUSE, snapshot Redis, destroy
./scripts/pause-stack.sh resume   # newest snapshot, full plan, type RESUME, apply
```

`REGION` and `PREFIX` env vars override `us-east-2` / `dashboard-prod`.

## Pause

1. Confirm the app is served elsewhere (or nowhere), webhooks (Stripe, SES inbound) are moved, BullMQ queues are drained, and that logging everyone out is acceptable.
2. `plan`, read the destroy list.
3. `pause`. Then `status` shows 0 NAT, no ALB, no Redis, 0 services.

Never run a plain `terraform apply` while paused. That is the resume path without the snapshot.

## Resume

1. Check `git diff` and tfvars: resume ships every pending change.
2. `resume`.
3. Point Cloudflare `portal`, `api`, `support`, `www` and apex at the new ALB hostname the script prints. DNS is not in terraform here (`manage_dns = false`), and a recreated ALB gets a new hostname.
4. Repoint webhooks, push a CI deploy if image tags in tfvars are stale (services `ignore_changes = [task_definition]`).
5. Delete the paused snapshot by hand once it is not needed.

## Gotchas

- Sessions and queues live in Redis; anything after the snapshot is lost.
- The Redis auth token is a `random_password` kept in state, so the URL secret comes back with the same token.
- With `alb_cloudflare_only`, the new ALB keeps the Cloudflare-only security group, so only the DNS target changes.
