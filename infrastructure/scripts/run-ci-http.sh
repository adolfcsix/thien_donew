#!/usr/bin/env bash
# Real HTTP E2E against built Next.js + NestJS and an EMPTY, disposable local PostgreSQL.
# Run ONLY after npm ci, typecheck, build and migrations. No database URL is logged.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

# These scripts fail closed before anything that can write to PostgreSQL.
node infrastructure/scripts/check-e2e-target.mjs
node infrastructure/scripts/check-e2e-database.mjs

# Linux GitHub runners provide setsid: isolate each npm process tree so
# cleanup also terminates the Node descendants, not just the npm launcher.
command -v setsid >/dev/null 2>&1 || { echo 'BLOCKED: setsid required for safe CI server cleanup'; exit 2; }
# Keep transient server output OUTSIDE the packaged source tree: otherwise
# audit:distribution fails after a CI/acceptance run even with clean source.
# Prefer GitHub runner temp when available, so upload-artifact can recover logs
# from a failed E2E run. Local executions continue to use TMPDIR or /tmp.
log_base="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
log_dir="$(mktemp -d "${log_base%/}/thiendo-ci-logs.XXXXXX")"
# A private, disposable file root must be shared by the API and library E2E.
export BOOK_PRIVATE_STORAGE_DIR="$(mktemp -d "${log_base%/}/thiendo-ci-private-books.XXXXXX")"
api_pid=''
web_pid=''
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$web_pid" ]]; then kill -- "-$web_pid" 2>/dev/null || true; fi
  if [[ -n "$api_pid" ]]; then kill -- "-$api_pid" 2>/dev/null || true; fi
  wait 2>/dev/null || true
  rm -rf -- "$BOOK_PRIVATE_STORAGE_DIR"
  if [[ "$status" -eq 0 ]]; then
    rm -rf -- "$log_dir"
  else
    printf 'CI API/Web server logs retained at: %s\n' "$log_dir" >&2
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

setsid npm run start -w @thiendo/api > "$log_dir/api-ci.log" 2>&1 &
api_pid=$!
API_BASE_URL="http://127.0.0.1:${API_PORT:-8080}" node tests/wait-for-api.mjs

setsid npm run start -w @thiendo/web > "$log_dir/web-ci.log" 2>&1 &
web_pid=$!
node tests/wait-for-next.mjs

# Never run mutating HTTP E2E if first-party proxy/DB fingerprint check fails.
node tests/next-proxy-smoke.mjs
node --test tests/api-postgres-e2e.test.mjs
node --test tests/v11155-books-http.test.mjs
node --test tests/v11156-van-kho-postgres.test.mjs
node --test tests/v11157-forum-postgres.test.mjs
node --test tests/v11157-forum-http-e2e.test.mjs
if [[ "${THIENDO_QIMEN_BROWSER:-0}" == '1' ]]; then
  node tests/qimen-browser-smoke.mjs
  node tests/qimen-structural-browser-smoke.mjs
  node tests/qimen-question-browser-smoke.mjs
fi
# Run the responsive Chromium suite while the *same built servers* remain alive.
# Its auth/storage fixtures are mocked; the PostgreSQL-backed HTTP test above is separate.
if [[ "${THIENDO_BROWSER_ACCEPTANCE:-0}" == '1' ]]; then
  node infrastructure/scripts/verify-browser-acceptance.mjs
fi
printf 'PASS: live Next -> Nest -> dedicated PostgreSQL HTTP E2E.\n'
