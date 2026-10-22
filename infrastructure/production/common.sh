#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
config_dir="${THIENDO_CONFIG_DIR:-/opt/thien-do/production}"
release_file="${THIENDO_RELEASE_FILE:-$config_dir/current.release.env}"
[[ "$config_dir" = /* ]] || { echo 'Use an absolute THIENDO_CONFIG_DIR' >&2; exit 2; }
compose=(docker compose --project-directory "$config_dir" --env-file "$config_dir/.env.production")
if [[ -f "$release_file" ]]; then compose+=(--env-file "$release_file"); fi
compose+=(-f "$config_dir/compose.production.yaml")
check_config() { node "$config_dir/preflight.mjs" "$config_dir/.env.production" "$release_file"; }
