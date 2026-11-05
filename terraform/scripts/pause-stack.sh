#!/usr/bin/env bash
# Pause / resume the hourly-billed part of the dashboard AWS stack.
# Pause is a targeted destroy; resume is a full apply seeded from a Redis snapshot.
# Runbook: docs/aws-pause-resume.md
set -euo pipefail

REGION="${REGION:-us-east-2}"
PREFIX="${PREFIX:-dashboard-prod}"
REDIS_ID="${PREFIX}-redis"
CLUSTER="${PREFIX}-cluster"
ALB_NAME="${PREFIX:0:26}-alb"
SNAPSHOT_PREFIX="${PREFIX}-redis-paused-"
PLAN_FILE=".pause-stack.tfplan"

TF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$TF_DIR"

TARGETS=(
  'module.vpc.aws_nat_gateway.this'
  'module.vpc.aws_eip.nat'
  'module.ecs.aws_lb.this'
  'module.ecs.aws_ecs_service.api'
  'module.ecs.aws_ecs_service.fe'
  'module.ecs.aws_ecs_service.fe_support'
  'module.ecs.aws_ecs_service.landing'
  'module.redis.aws_elasticache_replication_group.this'
  'module.waf[0].aws_wafv2_web_acl.this'
  'module.vpc_endpoints[0].aws_vpc_endpoint.interfaces'
  'module.alerts.aws_cloudwatch_metric_alarm.ecs_tasks_low'
  'module.alerts.aws_cloudwatch_metric_alarm.ecs_service_silent'
)

aws_() { aws --region "$REGION" --output text "$@"; }

cleanup_plan() { rm -f "$PLAN_FILE"; }

confirm() {
  local word="$1" answer
  echo
  echo "Account $(aws_ sts get-caller-identity --query Account), region $REGION, stack $PREFIX."
  read -r -p "Type $word to apply this plan, anything else aborts: " answer
  if [[ "$answer" != "$word" ]]; then
    cleanup_plan
    echo "Aborted. Nothing changed."
    exit 1
  fi
}

target_args() {
  local t
  for t in "${TARGETS[@]}"; do printf -- '-target=%s\n' "$t"; done
}

latest_snapshot() {
  aws_ elasticache describe-snapshots --snapshot-source manual \
    --query "reverse(sort_by(Snapshots[?starts_with(SnapshotName, '${SNAPSHOT_PREFIX}') && SnapshotStatus=='available'], &NodeSnapshots[0].SnapshotCreateTime))[0].SnapshotName"
}

status() {
  echo "NAT gateways:  $(aws_ ec2 describe-nat-gateways --filter "Name=tag:Name,Values=${PREFIX}-nat-*" "Name=state,Values=available,pending" --query 'length(NatGateways)')"
  echo "ALB:           $(aws_ elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].DNSName' 2>/dev/null || echo none)"
  echo "Redis:         $(aws_ elasticache describe-replication-groups --replication-group-id "$REDIS_ID" --query 'ReplicationGroups[0].Status' 2>/dev/null || echo none)"
  echo "ECS services:  $(aws_ ecs list-services --cluster "$CLUSTER" --query 'length(serviceArns)' 2>/dev/null || echo 0)"
  echo "Last snapshot: $(latest_snapshot)"
}

plan_pause() {
  mapfile -t args < <(target_args)
  terraform plan -destroy "${args[@]}" -out="$PLAN_FILE"
}

# Replica first so the primary keeps serving; cluster mode snapshots the whole group.
snapshot_redis() {
  local name="${SNAPSHOT_PREFIX}$(date +%Y%m%d-%H%M%S)" clustered member
  clustered="$(aws_ elasticache describe-replication-groups --replication-group-id "$REDIS_ID" --query 'ReplicationGroups[0].ClusterEnabled')"

  if [[ "$clustered" == "True" ]]; then
    aws_ elasticache create-snapshot --replication-group-id "$REDIS_ID" --snapshot-name "$name" >/dev/null
  else
    member="$(aws_ elasticache describe-replication-groups --replication-group-id "$REDIS_ID" \
      --query "ReplicationGroups[0].NodeGroups[0].NodeGroupMembers[?CurrentRole=='replica'] | [0].CacheClusterId")"
    if [[ -z "$member" || "$member" == "None" ]]; then
      member="$(aws_ elasticache describe-replication-groups --replication-group-id "$REDIS_ID" --query 'ReplicationGroups[0].MemberClusters[0]')"
    fi
    aws_ elasticache create-snapshot --cache-cluster-id "$member" --snapshot-name "$name" >/dev/null
  fi

  echo "Snapshotting Redis as $name..."
  local state=""
  until [[ "$state" == "available" ]]; do
    sleep 15
    state="$(aws_ elasticache describe-snapshots --snapshot-name "$name" --query 'Snapshots[0].SnapshotStatus')"
    echo "  $state"
    if [[ "$state" == "failed" ]]; then
      cleanup_plan
      echo "Snapshot failed. Nothing was destroyed."
      exit 1
    fi
  done
}

pause() {
  cat <<'EOF'
Before pausing, confirm all of these:
  - Cloudflare portal/api/support/www/apex no longer need the AWS ALB (they stop working).
  - Stripe, SES inbound and other webhooks no longer need the AWS api.
  - BullMQ queues are drained. Jobs queued after the snapshot are lost.
  - Everyone gets logged out. Sessions live only in Redis.
EOF
  plan_pause
  confirm PAUSE
  snapshot_redis
  terraform apply "$PLAN_FILE"
  cleanup_plan
  echo
  status
}

resume() {
  local snapshot
  snapshot="$(latest_snapshot)"
  if [[ -z "$snapshot" || "$snapshot" == "None" ]]; then
    echo "WARNING: no ${SNAPSHOT_PREFIX}* snapshot found. Redis comes back empty."
    snapshot=""
  else
    echo "Restoring Redis from $snapshot"
  fi

  echo "Resume is a FULL apply: any other pending terraform change ships with it."
  terraform plan -var "redis_restore_snapshot=${snapshot}" -out="$PLAN_FILE"
  confirm RESUME
  terraform apply "$PLAN_FILE"
  cleanup_plan

  cat <<EOF

Resumed. Next:
  - Point Cloudflare portal/api/support/www/apex at the new ALB: $(terraform output -raw alb_dns_name)
  - Repoint Stripe and SES inbound webhooks to the AWS api if they were moved.
  - Push a CI deploy if the image tags in tfvars are stale.
  - Delete ${snapshot:-the old snapshot} by hand once it is no longer needed.
EOF
}

case "${1:-}" in
  status) status ;;
  plan) plan_pause; cleanup_plan ;;
  pause) pause ;;
  resume) resume ;;
  *) echo "Usage: $0 status|plan|pause|resume" >&2; exit 2 ;;
esac
