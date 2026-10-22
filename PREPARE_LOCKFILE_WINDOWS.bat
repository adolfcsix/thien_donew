@echo off
setlocal
cd /d "%~dp0"
echo === THIEN DO - tao lockfile npm va thu build tren Windows ===
where node >nul 2>&1 || (echo [BLOCKED] Chua cai Node.js 22.13+ & exit /b 1)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] Chua cai npm & exit /b 1)
if exist "package-lock.json" (
  echo [0/5] Da co package-lock.json: kiem tra, KHONG tao lai hoac ghi de...
  call npm.cmd run check:lockfile || goto :fail
) else (
  echo [0/5] Kiem tra npm registry khong thay doi du an...
  node infrastructure\scripts\registry-preflight.mjs || goto :blocked_registry
  echo [1/5] Tao package-lock.json THAT tu npm registry...
  call npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund || goto :fail
)
echo [2/5] Kiem tra workspace/lockfile...
call npm.cmd run check:lockfile || goto :fail
echo [3/5] Cai lai cac goi tu lockfile...
call npm.cmd ci --no-audit --no-fund || goto :fail
echo [4/5] Kiem tra TypeScript...
call npm.cmd run typecheck || goto :fail
echo [5/5] Build Next.js va NestJS...
call npm.cmd run build || goto :fail
echo [PASS] Lockfile, npm ci, typecheck, build thanh cong tren may NAY.
echo Hay commit package-lock.json vao GitHub va chay FULL E2E voi database test rieng.
exit /b 0
:fail
echo [BLOCKED] Mot buoc that bai. Khong ket luan full-stack da san sang.
exit /b 1

:blocked_registry
echo [BLOCKED] Khong the ket noi npm registry. Khong xoa node_modules, khong tao lockfile gia.
echo Xem CHECK_THIEN_DO_NPM_WINDOWS.bat; hoac dung GitHub Actions private bootstrap-lockfile.yml.
exit /b 2
