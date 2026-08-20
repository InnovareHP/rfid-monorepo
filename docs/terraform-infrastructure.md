# Terraform infrastructure

AWS stack for the dashboard monorepo, in `terraform/`. Ported from the fax app's
`terraform/` with the cost analysis in `2026-08-12-terraform-cost-and-prod-db`
applied at the start rather than bolted on afterwards, and with Postgres moved
in-account instead of staying on Neon.

Root `main.tf` is module-only, no bare resources. State in S3 with
`use_lockfile = true` (needs Terraform >= 1.10, no DynamoDB table). Three
providers: default, `us_east_1` for CloudFront certs, `replica` for DR.

## Modules

| Module | Provisions | Gated by |
| --- | --- | --- |
| `kms` | 5 CMKs: s3, redis, secrets, db, logs | always |
| `vpc` | /16, 2 AZ, public + private /20s, NAT, free S3 gateway endpoint, flow logs to S3 | always |
| `security` | ALB / ECS / Redis / DB / tunnel SGs | always |
| `uploads` | uploads bucket, `public/` + `private/`, SSE-S3, CloudFront OAC over `public/` only | always |
| `s3_replication` | CRR of uploads to us-west-2 | `enable_s3_replication` |
| `landing_site` | S3 + CloudFront for the static Astro build, index-rewrite function | always |
| `db_backup` | Object Lock WORM bucket for `pg_dump` archives | always |
| `rds` | private Postgres 16, gp3, KMS, `rds.force_ssl`, DATABASE_URL secret, SSM forwarder | always |
| `redis` | ElastiCache 7.1, TLS + auth token, `noeviction`, `notify-keyspace-events Ex`, REDIS_URL secret | always |
| `dns` | Route53 zone, regional ACM cert for the ALB, us-east-1 cert for CloudFront | `manage_dns` |
| `ecs` | cluster, 3 ECR repos, ALB + 3 TGs + host rules, 3 services, IAM, log groups, app secret | always |
| `waf` | WAFv2 on the ALB: Common, KnownBadInputs, SQLi, IP reputation, rate limit; logs to S3 | `enable_waf` |
| `ses` | outbound config set, sending identity, optional inbound receiving | always (inbound gated) |
| `vpc_endpoints` | billable interface endpoints | `enable_vpc_endpoints` (off) |
| `backup` | AWS Backup vault + plan over the uploads bucket | `enable_aws_backup` (off) |
| `cloudtrail` | multi-region trail to S3, KMS, log file validation | always |
| `alerts` | SNS topic + ECS / replication / RDS alarms | always |

## Services

| Service | Port | CPU/Mem | Min/Max | Capacity |
| --- | --- | --- | --- | --- |
| api | 8080 | 512 / 1024 | 2 / 6 | FARGATE |
| fe | 3000 | 512 / 1024 | 2 / 4 | FARGATE base 1 + FARGATE_SPOT |
| fe-support | 3001 | 256 / 512 | 1 / 3 | FARGATE base 1 + FARGATE_SPOT |
| landing | - | - | - | S3 + CloudFront, no task |

Routing is host-based on the HTTPS listener: `api.` to the API target group,
`app.` to fe, `support.` to fe-support. Apex and `www.` are Route53 alias
records on the landing CloudFront distribution, not on the ALB.

## Decisions worth keeping

- **Flow logs and WAF logs go to S3, not CloudWatch Logs.** CWL ingest is
  $0.50/GB; S3 is ~$0.023/GB. On all-traffic flow logs and per-request WAF
  logs at 7-year retention that is the difference between a rounding error and
  the largest line item.
- **App logs at 30 days, audit logs at 7 years.** HIPAA 164.316(b)(2) requires
  six years for documentation and audit records, not for every line of
  container stdout. The audit record already lives in CloudTrail, the
  `AuditLog` table, and the flow logs, all on `audit_log_retention_days`.
- **One NAT gateway.** Egress from private subnets is Stripe, Google,
  Microsoft, Bedrock and SES calls; S3 bypasses NAT through the free gateway
  endpoint. A single-AZ NAT outage costs those calls in one AZ, which retries
  absorb. Do not "fix" this by turning on `enable_vpc_endpoints` instead —
  six interface endpoints across two AZs is ~$88/mo, worse than a second NAT.
- **Container Insights off.** It bills per ingested metric and scales with task
  count. The `alerts` module watches service health on free `AWS/ECS` metrics
  instead. Turn Insights on for a week when investigating, then off.
- **Spot with an on-demand base on the frontends.** fe and fe-support are
  stateless behind the ALB and Spot gives a two-minute drain warning.
  `base = 1` keeps one on-demand task per service so a Spot capacity crunch
  cannot empty a target group. The API stays fully on-demand — it holds Stripe
  webhooks, uploads and socket.io connections.
- **ALB idle timeout 300s and stickiness on the API target group.** socket.io
  holds a connection open between events, and its polling transport spreads the
  handshake across requests that must land on the same task.
- **Uploads bucket is SSE-S3, not KMS.** `image.service.ts` sends
  `ServerSideEncryption: AES256` on every PutObject; a KMS bucket default would
  reject those calls. Moving to KMS is an app change plus a
  `kms:GenerateDataKey` grant, not a bucket setting — it stays the open HIPAA
  item.
- **CloudFront reads `public/` only.** The bucket policy grants
  `s3:GetObject` on `${bucket}/public/*` and nothing else, so a later
  misconfiguration cannot expose receipts under `private/`. Block Public Access
  stays fully on.
- **ECR keeps the last 10 images** on all three repos.
- **The ALB is HTTP-only until a cert exists.** Set `manage_dns = false` for
  the first apply; nothing depends on a certificate that has not been issued.

## The database

Postgres runs in this account, in the private subnets, with no public endpoint.
`rds.force_ssl = 1` rejects any non-TLS connection at the engine. Storage
autoscales to `db_max_allocated_storage`, so there is no manual resize.

`DATABASE_URL` is generated by the `rds` module into its own Secrets Manager
entry and injected into the task definition from there. It is not one of the
hand-populated keys in the app secret — a password rotation is an apply plus a
service restart, not a manual edit. `REDIS_URL` works the same way.

### Reaching it from a laptop

A `t4g.nano` SSM forwarder (~$4/mo, zero inbound SG rules, no SSH key) makes
the private endpoint reachable as `localhost:5432`:

```bash
terraform output -raw db_tunnel_command   # prints the full command
```

Then connect with the URL from the secret, swapping the host for localhost:

```
postgresql://<user>:<password>@localhost:5432/<db>?sslmode=require
```

`sslmode=require`, not `verify-full`: through a localhost tunnel the RDS
certificate CN will never match `localhost`. Every session is recorded in
CloudTrail, which is a better audit story than a public endpoint behind an IP
allowlist that drifts the moment someone works from a cafe.

`db_publicly_accessible = true` exists for staging. Do not set it on a database
holding PHI.

### Backups

RDS automated backups run at 35 days. The 7-year record is `pg_dump` archives
written to the Object Lock bucket (`db_backup_bucket`), which is COMPLIANCE
mode — not even the root account can delete an object before retention lapses.

## First apply

1. Create the state bucket and set it in `backend.tf`.
2. `cp terraform.tfvars.example terraform.tfvars` and fill it in. Leave
   `manage_dns = false`.
3. `terraform init && terraform plan -out=tfplan`. Read the plan. Never apply
   an unread plan against prod.
4. `terraform apply tfplan`. Services will not start yet — the ECR repos are
   empty and the app secret holds `REPLACE_ME`.
5. Populate the app secret. Every key must have a real value; the API's Zod
   schema throws on a missing one and the container exits before `listen()`,
   which shows up as an empty target group and a 503.
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id "$(terraform output -raw app_secrets_arn)" \
     --secret-string file://secrets.json
   ```
6. Build and push the three images, then force a new deployment.
7. Run the Prisma migrations from inside the VPC — Postgres is private:
   ```bash
   aws ecs execute-command --cluster <cluster> --task <task-id> \
     --container api --interactive --command "/bin/sh"
   ```
8. Sync the landing build and invalidate:
   ```bash
   pnpm --filter landing build
   aws s3 sync apps/landing/dist "s3://$(terraform output -raw landing_bucket)" --delete
   aws cloudfront create-invalidation \
     --distribution-id "$(terraform output -raw landing_distribution_id)" --paths '/*'
   ```
9. Publish the SES DNS records from `ses_sending_dkim_records`, then confirm
   the SNS email subscriptions.
10. Only once the NS records are live at the registrar, set `manage_dns = true`
    and apply again. That issues both certs, creates the ALB records, and
    switches the listener to HTTPS.

## Open items before this can run production traffic

These are app-side, not Terraform-side. The stack is correct as written; these
are what stands between it and a working deploy.

- **`apps/fe` and `apps/fe-support` run the Vite dev server in their production
  image.** Both Dockerfiles end in `pnpm --filter <app> start`, which is
  `vite --host --port 3000`. That is a dev server with HMR — it is not a
  production static server, and it rebuilds on the fly. Serve the `dist/`
  output instead, the way `apps/landing/Dockerfile` already does. Until that
  changes, the fe target groups will be slow and fragile regardless of how the
  infrastructure is configured.
- **`VITE_*` values are baked in at image build time.** `VITE_API_URL`,
  `VITE_AWS_REGION` and `VITE_AWS_LOCATION_API_KEY` must be passed as docker
  build args in CI. Nothing in the task definition can configure them, so the
  images are environment-specific.
- **`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are required by
  `app-config.ts`.** On Fargate the task role already supplies credentials
  through IMDS. Making both optional in the Zod schema removes two long-lived
  access keys from the account entirely — worth doing, and a real HIPAA
  improvement. Until then they sit in the app secret.
- **The Amazon Location API key for map tiles is still manual.** The AWS
  provider has no resource for it. Create it scoped to `geo-maps:GetTile` and
  `geo-maps:GetStyleDescriptor` only, restricted to the dashboard origins, with
  an expiry and a rotation owner. Never grant it `geo-places:*` — geocoding
  runs server-side through `GET /api/places/county-center` precisely so the
  signing credentials stay on the API.
- **No `terraform fmt` / `validate` / `plan` gate in CI.** A plan-on-PR job
  would catch drift before someone applies from a laptop.
- **`image_tag_mutability = "MUTABLE"` with `*_image_tag = "latest"` means a
  rollback has no immutable tag to roll back to.** Tag by commit SHA and flip
  the variable to `IMMUTABLE` when CI is ready.

## Levers not taken

- **Graviton (ARM64)** is ~20% off all Fargate. `fargate_cpu_architecture`
  wires it, but every native dependency (Prisma engines, `sharp`) needs an
  arm64 build and CI must push multi-arch images. Treat it as its own change,
  verified in staging first.
- **A Fargate Compute Savings Plan** is ~20% off the on-demand baseline with no
  code change. Buy it once the min counts stop moving.
- **AWS Backup over the uploads bucket** is off. The bucket is already
  versioned, cross-region replicated and lifecycle-tiered, and AWS Backup's
  warm tier costs more per GB than the storage it duplicates. This is a
  compliance judgment as much as a cost one — decide it with whoever signs off
  on the risk assessment.
