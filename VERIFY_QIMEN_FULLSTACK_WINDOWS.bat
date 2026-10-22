@echo off
setlocal
cd /d "%~dp0"
echo THIEN DO - REAL QIMEN POSTGRES + BROWSER ACCEPTANCE
if not exist ".env.e2e" (
 echo [BLOCKED] Create .env.e2e from .env.e2e.example and check isolated database settings.
 exit /b 2
)
where node >nul 2>&1 || (echo [BLOCKED] Node.js 22.13+ required. & exit /b 2)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] npm required. & exit /b 2)
where docker >nul 2>&1 || (echo [BLOCKED] Docker Desktop required. & exit /b 2)
docker info >nul 2>&1 || (echo [BLOCKED] Start Docker Desktop first. & exit /b 2)
set "THIENDO_BROWSER_TOOLS=%TEMP%\thien-do-browser-1_62_1"
call npm.cmd install --prefix "%THIENDO_BROWSER_TOOLS%" --no-audit --no-fund --save-exact playwright@1.62.1
if errorlevel 1 exit /b 1
node "%THIENDO_BROWSER_TOOLS%\node_modules\playwright\cli.js" install chromium
if errorlevel 1 exit /b 1
set "THIENDO_PLAYWRIGHT_MODULE=%THIENDO_BROWSER_TOOLS%\node_modules\playwright\index.mjs"
docker compose -f infrastructure\compose.test.yaml up -d
if errorlevel 1 exit /b 1
echo Guards require a local, EMPTY *_test database and matching API database identity.
echo Existing data is never cleared automatically. Keep ports 3000 and 8080 free.
call npm.cmd run check:qimen:full:testdb
exit /b %errorlevel%
