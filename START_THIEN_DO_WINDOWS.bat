@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo THIEN DO - SAFE LOCAL DEVELOPMENT START
echo ========================================
where node >nul 2>&1 || (echo [BLOCKED] Can cai Node.js 22.13+ & exit /b 2)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:2)"
if errorlevel 1 (echo [BLOCKED] Node.js phai la ban 22.13+ & exit /b 2)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] Can npm & exit /b 2)
if not exist ".env" (
  echo [BLOCKED] Chua co .env. Copy .env.example thanh .env va kiem tra DATABASE_URL.
  echo Khong dung database production trong moi truong phat trien.
  exit /b 2
)
echo [CHECK] Kiem tra node_modules that, lockfile, .env va ket noi PostgreSQL local (chi TCP)...
node --env-file-if-exists=.env infrastructure\scripts\local-runtime-doctor.mjs
if errorlevel 1 (
  echo [BLOCKED] Chua du dieu kien mo web. Xu ly cac dong BLOCKED phia tren truoc.
  echo Neu thieu goi npm: chay PREPARE_LOCKFILE_WINDOWS.bat tren may co mang.
  echo Neu database-tcp bi BLOCKED: kiem tra PostgreSQL va DATABASE_URL trong .env.
  exit /b 2
)
echo [START] Next.js :3000 va NestJS :8080; Ctrl+C de dung ca hai.
call npm.cmd run dev
exit /b %errorlevel%
