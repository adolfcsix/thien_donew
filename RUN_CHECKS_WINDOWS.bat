@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo THIEN DO - SOURCE / TYPECHECK / BUILD (NO REINSTALL)
echo ==========================================
where node >nul 2>&1 || (echo [BLOCKED] Can Node.js 22.13+ & exit /b 2)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] Can npm & exit /b 2)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:2)"
if errorlevel 1 (echo [BLOCKED] Node.js phai la ban 22.13+ & exit /b 2)
call npm.cmd run check:release:source
if errorlevel 1 exit /b 1
call npm.cmd run check:lockfile
if errorlevel 1 exit /b 2
node infrastructure\scripts\dependency-install-check.mjs
if errorlevel 1 (
  echo [BLOCKED] Chua du dependencies. KHONG xoa node_modules hay cai lai khi dang check.
  echo Chay PREPARE_LOCKFILE_WINDOWS.bat tren may co npm registry neu can cai lai.
  exit /b 2
)
call npm.cmd run typecheck
if errorlevel 1 exit /b 1
call npm.cmd run build
if errorlevel 1 exit /b 1
echo [PASS] Node regression, typecheck va build tren may NAY. E2E/Chromium chua duoc xac nhan.
exit /b 0
