#!/usr/bin/env bash
# Default is a read-only plan. --apply is for a configured VPS after CI acceptance.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
candidate="${1:-}"
[[ -f "$candidate" ]] || { echo 'Pass an existing release.env containing API/WEB digests' >&2; exit 2; }
node "$config_dir/preflight.mjs" "$config_dir/.env.production" "$candidate"
if [[ "${2:-}" != '--apply' ]]; then echo 'PLAN: pull -> backup -> reviewed migration -> start -> HTTPS smoke -> keep or rollback'; exit 0; fi
[[ "${MIGRATION_COMPATIBILITY:-}" == 'expand-only-reviewed' ]] || { echo 'Review backward-compatible migrations before apply' >&2; exit 2; }
command -v flock >/dev/null
exec 8>"$config_dir/deploy.lock"
flock -n 8 || { echo 'Deployment is already running' >&2; exit 2; }
previous="$config_dir/previous.release.env"
if [[ -f "$config_dir/current.release.env" ]]; then cp "$config_dir/current.release.env" "$previous"; fi
# Save candidate locally without printing any environment configuration.
cp "$candidate" "$config_dir/candidate.release.env"
release_file="$config_dir/candidate.release.env"
compose=(docker compose --project-directory "$config_dir" --env-file "$config_dir/.env.production" --env-file "$release_file" -f "$config_dir/compose.production.yaml")
"${compose[@]}" pull api web migrate
"${compose[@]}" up -d --wait --wait-timeout 180 db
THIENDO_RELEASE_FILE="$release_file" "$config_dir/backup.sh" --quiesce
# Exclude scheduled snapshots while migrations or container changes are running.
exec 9>"$config_dir/backup.lock"
flock -n 9 || { echo 'A backup started before migration; retry deployment later' >&2; exit 2; }
rollback_on_error() {
 local status=$?
 trap - ERR
 if [[ -f "$previous" ]]; then
  echo 'Deployment failed. Restoring previous application images; database is NOT restored.' >&2
  docker compose --project-directory "$config_dir" --env-file "$config_dir/.env.production" --env-file "$previous" -f "$config_dir/compose.production.yaml" up -d api web gate edge || true
 else
  echo 'First release failed. Stopping public/application services; retaining DB volumes.' >&2
  "${compose[@]}" stop edge gate api web || true
 fi
 exit "$status"
}
trap rollback_on_error ERR
"${compose[@]}" --profile ops run --rm migrate
"${compose[@]}" up -d --wait --wait-timeout 180 api web gate edge
domain=$(node "$config_dir/preflight.mjs" "$config_dir/.env.production" "$release_file" | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>console.log(JSON.parse(s).domain))')
PUBLIC_ORIGIN="https://$domain" BACKUP_STATUS_FILE="$config_dir/backup-status.json" RESTORE_DRILL_STATUS_FILE="$config_dir/restore-status.json" node "$config_dir/ops-check.mjs"
cp "$release_file" "$config_dir/current.release.env"
trap - ERR
echo 'Deployment smoke passed. Native DB/browser/OAuth/load acceptance must also be recorded.'
