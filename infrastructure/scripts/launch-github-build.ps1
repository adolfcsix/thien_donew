# THIEN DO - GitHub Actions build bootstrap (requires GitHub CLI and Git).
# Creates a PRIVATE repository ONLY after an interactive confirmation.
# No tokens/passwords are accepted by the script or written to logs.
param([string]$RepositoryName = 'thien-do-fullstack-check')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $root

function Require-Tool([string]$Name, [string]$Help) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing $Name. $Help"
  }
}
function Check-Exit([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)." }
}
Require-Tool 'git' 'Install Git for Windows from https://git-scm.com/download/win'
Require-Tool 'gh' 'Run: winget install --id GitHub.cli -e; reopen PowerShell.'
& gh auth status
Check-Exit 'GitHub authentication. Run gh auth login'
if ($RepositoryName -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{1,95}$') {
  throw 'RepositoryName must be 2-96 letters/numbers/dot/hyphen/underscore.'
}
$owner = ((& gh api user --jq '.login') | Out-String).Trim()
Check-Exit 'GitHub account lookup'
if (-not $owner) { throw 'GitHub account lookup returned an empty login.' }
$full = "$owner/$RepositoryName"
Write-Host "`nTarget: https://github.com/$full (PRIVATE)" -ForegroundColor Cyan
Write-Host 'The source code will be committed and uploaded to your private GitHub repository.'
Write-Host 'Review the project and remove any personal or confidential content first.'
$answer = Read-Host 'Type PRIVATE to explicitly approve uploading this project'
if ($answer -cne 'PRIVATE') { throw 'Cancelled. No code uploaded.' }

# Do not upload local credentials, reports or system artifacts.
if (Test-Path '.git') { throw 'This directory already has a .git folder. Use a fresh extracted ZIP to prevent pushing to the wrong remote.' }
$gitEmail = ((& git config user.email) | Out-String).Trim()
$gitName = ((& git config user.name) | Out-String).Trim()
if (-not $gitEmail -or -not $gitName) {
  throw 'Configure git identity first: git config --global user.name "Your Name" ; git config --global user.email "your@email"'
}
& node infrastructure/scripts/check-github-readiness.mjs
Check-Exit 'GitHub source preflight'
& gh repo view $full --json name *> $null
if ($LASTEXITCODE -eq 0) { throw "Repository $full already exists; choose another RepositoryName to avoid overwriting." }
& git init -b main
Check-Exit 'git init'
& git add -A
Check-Exit 'git add'
$staged = @(& git diff --cached --name-only)
Check-Exit 'git staged listing'
if ($staged.Count -eq 0) { throw 'No source files staged.' }
$unsafe = @($staged | Where-Object {
    ($_ -match '(^|/)(\.env($|\.(?!.*\.example$))|\.npmrc$|id_rsa|id_ed25519|.*\.(pem|p12|pfx|key|log|sqlite|db)$)') -or
    ($_ -match '(^|/)docs/reports/')
})
if ($unsafe.Count -gt 0) {
  Write-Host ($unsafe -join "`n") -ForegroundColor Red
  throw 'Potentially sensitive files staged. Remove them before uploading. NO PUSH occurred.'
}
Write-Host "Ready to upload $($staged.Count) source files; no obvious secret-file names staged." -ForegroundColor Green
$releaseVersion = ((& node -p "require('./package.json').version") | Out-String).Trim()
Check-Exit 'Read release version'
if ($releaseVersion -notmatch '^[0-9]+[.][0-9]+[.][0-9]+$') { throw 'Invalid project release version.' }
& git commit -m "THIEN DO V$releaseVersion audited build candidate"
Check-Exit 'git commit'
& gh repo create $full --private --source=. --remote=origin --push
Check-Exit 'Create private GitHub repository and push'
Write-Host "`nRepository created: https://github.com/$full"

$started = $false
for ($i=1; $i -le 6; $i++) {
  & gh workflow run bootstrap-lockfile.yml --repo $full --ref main
  if ($LASTEXITCODE -eq 0) { $started=$true; break }
  Write-Host 'GitHub may still be indexing the newly uploaded workflow. Retrying...'
  Start-Sleep -Seconds 7
}
if (-not $started) {
  Write-Host "The repository was pushed successfully, but dispatch is not confirmed. Open https://github.com/$full/actions and run 'Bootstrap lockfile and validate full-stack' manually." -ForegroundColor Yellow
  exit 2
}
Write-Host "`nGitHub Actions is requested (not yet verified as passed)." -ForegroundColor Green
Write-Host "Open: https://github.com/$full/actions/workflows/bootstrap-lockfile.yml"
Write-Host 'When the run has results, launch GET_GITHUB_BUILD_RESULTS_WINDOWS.bat to fetch the lockfile and logs.'
