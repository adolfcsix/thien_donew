# Download the npm lockfile or failed-job logs from the latest GitHub Actions bootstrap run.
# Read-only on GitHub; writes artifacts to the current extracted local folder.
$ErrorActionPreference = 'Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $root
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI is required. Install gh and run gh auth login.' }
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Run gh auth login first.' }
if (-not (Test-Path .git)) { throw 'This folder has no .git repository; first run START_GITHUB_BUILD_WINDOWS.bat here.' }
$remote = ((& gh repo view --json nameWithOwner --jq '.nameWithOwner') | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $remote) { throw 'Could not resolve GitHub remote for this folder.' }
# A lockfile is only suitable for the exact checkout that generated it.
# Do not select a run merely because it is the most recent Actions result.
$localSha = ((& git rev-parse HEAD) | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $localSha -notmatch '^[0-9a-fA-F]{40}$') { throw 'Could not determine local Git HEAD.' }
$remoteSha = ((& gh api "repos/$remote/branches/main" --jq '.commit.sha') | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $remoteSha -notmatch '^[0-9a-fA-F]{40}$') { throw 'Could not verify remote main branch SHA.' }
if ($localSha -cne $remoteSha) {
  throw 'Local HEAD differs from remote main. Sync/commit the intended source before downloading artifacts.'
}
$runJson = ((& gh run list -R $remote -w bootstrap-lockfile.yml -L 50 --json databaseId,headSha,headBranch,status,conclusion) | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $runJson) { throw 'Cannot list GitHub Actions bootstrap runs.' }
$runId = (($runJson | & node infrastructure/scripts/select-bootstrap-run.mjs $localSha) | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $runId -notmatch '^[0-9]+$') {
  throw 'No completed bootstrap run for this exact commit. Inspect Actions before retrieving the lockfile.'
}
Write-Host "Latest run: https://github.com/$remote/actions/runs/$runId"
& gh run view $runId -R $remote
# Download into a run-scoped staging directory. Never silently replace a lockfile
# created or reviewed by the user (or committed on a different branch).
$reportDir = Join-Path $root 'docs/reports/github-actions'
$artifactDir = Join-Path $reportDir "run-$runId"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
& gh run download $runId -R $remote -n thien-do-verified-npm-lockfile -D $artifactDir
if ($LASTEXITCODE -eq 0) {
  $candidate = Join-Path $artifactDir 'package-lock.json'
  if (-not (Test-Path $candidate)) { throw 'Artifact download succeeded, but package-lock.json is missing.' }
  # A single fail-closed implementation performs the preview and atomic
  # create-if-absent transfer. It never replaces a different lockfile.
  & node infrastructure/scripts/import-lockfile.mjs --candidate $candidate --apply
  if ($LASTEXITCODE -ne 0) { throw 'Candidate rejected; project lockfile was NOT replaced.' }
  Write-Host 'Review the imported lockfile, then run npm ci, typecheck and build.' -ForegroundColor Cyan
} else {
  Write-Host 'Lockfile artifact unavailable. Inspect the failed GitHub Actions job.' -ForegroundColor Yellow
}
# Fullstack receipt is OPTIONAL: a job may generate a valid lockfile but fail
# at TypeScript, build or E2E. Never mistake those two outcomes.
$proofDir = Join-Path $artifactDir 'fullstack-proof'
New-Item -ItemType Directory -Force -Path $proofDir | Out-Null
& gh run download $runId -R $remote -n thien-do-fullstack-proof -D $proofDir *> $null
if ($LASTEXITCODE -eq 0) {
  $proofFile = Join-Path $proofDir 'fullstack-proof.json'
  if (-not (Test-Path $proofFile)) { throw 'Fullstack artifact downloaded without expected receipt.' }
  & node infrastructure/scripts/build-proof.mjs --verify $proofFile --sha $localSha --run-id $runId
  if ($LASTEXITCODE -ne 0) { throw 'Fullstack proof INVALID. Do not claim build passed.' }
  Write-Host '[PASS] GitHub fullstack CI receipt is valid for this exact commit and run.' -ForegroundColor Green
  Write-Host 'Scope: CI test only. Production readiness requires additional checks.'
} else {
  Write-Host '[NOT VERIFIED] No successful fullstack receipt from this run.' -ForegroundColor Yellow
  Write-Host 'The lockfile alone does NOT prove TypeScript, build or PostgreSQL E2E.'
}
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
& gh run view $runId -R $remote --log-failed | Out-File -FilePath (Join-Path $reportDir 'failed-jobs.log') -Encoding utf8
Write-Host "Saved failed-job log (if available) to $reportDir" -ForegroundColor Cyan
Write-Host 'Review and redact possible secrets in logs before sharing them.'
