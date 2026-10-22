@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo [BLOCKED] Install Node.js 22.13+ & exit /b 2)
if /I "%~1"=="--smoke" (
  echo Checking local Next.js + API + PostgreSQL readiness, read-only GET only...
  node --env-file-if-exists=.env infrastructure\scripts\local-runtime-doctor.mjs --smoke
) else (
  echo Checking local THIEN DO prerequisites (non-destructive)...
  node --env-file-if-exists=.env infrastructure\scripts\local-runtime-doctor.mjs
)
exit /b %errorlevel%
