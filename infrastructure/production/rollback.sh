#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
previous="$config_dir/previous.release.env"
node "$config_dir/preflight.mjs" "$config_dir/.env.production" "$previous"
if [[ "${1:-}" != '--apply' ]]; then echo 'PLAN: restore previous application image digests; retain database and backups'; exit 0; fi
[[ "${ROLLBACK_SCHEMA_COMPATIBLE:-}" == 'yes' ]] || { echo 'Confirm old application supports current schema before rollback' >&2; exit 2; }
exec 8>"$config_dir/deploy.lock"
flock -n 8 || exit 2
exec 9>"$config_dir/backup.lock"
flock -n 9 || { echo 'A backup is running; retry rollback later' >&2; exit 2; }
docker compose --project-directory "$config_dir" --env-file "$config_dir/.env.production" --env-file "$previous" -f "$config_dir/compose.production.yaml" up -d --wait --wait-timeout 180 api web gate edge
domain=$(node "$config_dir/preflight.mjs" "$config_dir/.env.production" "$previous" | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>console.log(JSON.parse(s).domain))')
PUBLIC_ORIGIN="https://$domain" BACKUP_STATUS_FILE="$config_dir/backup-status.json" RESTORE_DRILL_STATUS_FILE="$config_dir/restore-status.json" node "$config_dir/ops-check.mjs"
cp "$config_dir/current.release.env" "$config_dir/rolled-back.release.env"
cp "$previous" "$config_dir/current.release.env"
echo 'Application images rolled back. No database restore or destructive migration was executed.'
