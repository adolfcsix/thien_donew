#!/usr/bin/env bash
# Consistent DB + private-file snapshot. Explicit quiesce permits brief API downtime.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
check_config >/dev/null
if [[ "${1:-}" != '--quiesce' ]]; then
 echo 'PLAN: briefly stop a running API, snapshot DB and private files, resume API, encrypt and upload both; pass --quiesce to execute'
 exit 0
fi
: "${RESTIC_REPOSITORY:?Set remote RESTIC_REPOSITORY}"
: "${RESTIC_PASSWORD_FILE:?Set RESTIC_PASSWORD_FILE}"
case "$RESTIC_REPOSITORY" in s3:*|sftp:*|rest:*) ;; *) echo 'An off-server restic repository is required' >&2; exit 2;; esac
node -e 'const fs=require("fs");if(fs.statSync(process.argv[1]).mode&0o077)throw Error("Restic password file must be chmod 600");' "$RESTIC_PASSWORD_FILE"
command -v restic >/dev/null
command -v flock >/dev/null
exec 9>"$config_dir/backup.lock"
flock -n 9 || { echo 'Another backup is running' >&2; exit 2; }
tmp_dir=$(mktemp -d)
api_stopped=false
cleanup() {
 local status=$?
 trap - EXIT
 if [[ "$api_stopped" == true ]]; then
  if ! "${compose[@]}" start api >/dev/null; then status=1; echo 'API restart failed; operator action required' >&2; fi
 fi
 if [[ "$status" != 0 ]]; then
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],JSON.stringify({ok:false,time:new Date().toISOString(),reason:"backup-failed"}));fs.chmodSync(process.argv[1],0o644)' "$config_dir/backup-status.json"
 fi
 rm -rf -- "$tmp_dir"
 exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir "$tmp_dir/bundle"
running=$("${compose[@]}" ps --status running --services api)
if [[ "$running" == api ]]; then
 api_stopped=true
 "${compose[@]}" stop -t 45 api >/dev/null
fi
# No migrations or other writers may run during this maintenance window.
"${compose[@]}" exec -T -u postgres db pg_dump -U thiendo_owner -d thiendo -Fc --no-owner --no-acl > "$tmp_dir/bundle/thien-do.dump"
[[ -s "$tmp_dir/bundle/thien-do.dump" ]] || { echo 'Empty dump' >&2; exit 1; }
"${compose[@]}" exec -T -u postgres db pg_restore --list < "$tmp_dir/bundle/thien-do.dump" > /dev/null
"${compose[@]}" exec -T -u postgres db psql -X -v ON_ERROR_STOP=1 -U thiendo_owner -d thiendo -At < "$config_dir/private-assets-index.sql" > "$tmp_dir/bundle/asset-index.json"
"${compose[@]}" --profile ops run --rm --no-deps -T assets > "$tmp_dir/bundle/private-assets.tda"
[[ -s "$tmp_dir/bundle/private-assets.tda" ]] || { echo 'Empty private-file snapshot' >&2; exit 1; }
if [[ "$api_stopped" == true ]]; then "${compose[@]}" start api >/dev/null; api_stopped=false; fi
node "$config_dir/file-bundle.mjs" verify-index "$tmp_dir/bundle/private-assets.tda" "$tmp_dir/bundle/asset-index.json" > "$tmp_dir/asset-index-receipt.json"
# Both verified inputs are uploaded in ONE encrypted snapshot, not unrelated IDs.
restic backup "$config_dir/.env.production" "$release_file" "$config_dir/secrets" --tag thien-do-config --json > "$tmp_dir/config-receipt.json"
node "$config_dir/file-bundle.mjs" pack "$tmp_dir/bundle" | restic backup --stdin --stdin-filename thien-do.bundle --tag thien-do-complete --json > "$tmp_dir/receipt.json"
node - "$tmp_dir/receipt.json" "$tmp_dir/config-receipt.json" "$config_dir" "$tmp_dir/asset-index-receipt.json" <<'NODE'
const fs=require('node:fs');
const [receipt,configReceipt,dir,assetReceipt]=process.argv.slice(2);
const assets=JSON.parse(fs.readFileSync(assetReceipt,'utf8'));
if(assets.referencesVerified!==true||!Number.isSafeInteger(assets.references)||assets.references<0)throw Error('Database asset references were not verified');
function snapshot(file){const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);const id=rows.find(x=>x.message_type==='summary')?.snapshot_id;if(!/^[a-f0-9]{8,64}$/.test(id||''))throw Error('Backup provider did not return a snapshot ID');return id;}
const result={ok:true,event:'backup_complete',time:new Date().toISOString(),snapshot:snapshot(receipt),configSnapshot:snapshot(configReceipt),includesPrivateAssets:true,verifiedAssetReferences:true,assetReferences:assets.references,format:'thien-do-file-bundle-v1',restoreDrillVerified:false};
fs.writeFileSync(dir+'/last-backup.json',JSON.stringify(result)+'\n',{mode:0o600});
fs.writeFileSync(dir+'/backup-status.json',JSON.stringify(result)+'\n',{mode:0o600});
// The unprivileged monitor reads this non-secret receipt, never backup credentials.
fs.chmodSync(dir+'/backup-status.json',0o644);
console.log(JSON.stringify(result));
NODE
# Retention/pruning remains a separate reviewed operation.
