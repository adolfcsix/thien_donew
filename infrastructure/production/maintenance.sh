#!/usr/bin/env bash
# Read-only preview by default. Expired sessions/nonces; OTP history retains 48h.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
check_config >/dev/null
if [[ "${1:-}" != '--apply' ]]; then echo 'PLAN: remove expired sessions/nonces, auth challenges older than 48 hours and up to 10000 page-view events older than 90 days'; exit 0; fi
exec 7>"$config_dir/maintenance.lock"
flock -n 7 || exit 2
exec 9>"$config_dir/backup.lock"
flock -n 9 || { echo 'A backup is running; retry maintenance later' >&2; exit 2; }
for script in cleanup-sessions.mjs cleanup-auth-challenges.mjs cleanup-page-views.mjs; do
 "${compose[@]}" exec -T api node infrastructure/production/container-entrypoint.mjs node "infrastructure/scripts/$script" --apply
done
