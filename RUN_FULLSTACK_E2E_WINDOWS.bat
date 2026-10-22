@echo off
setlocal
cd /d "%~dp0"
echo THIEN DO - ISOLATED FULL-STACK E2E
if not exist ".env.e2e" (
  echo [BLOCKED] Tao .env.e2e tu .env.e2e.example truoc.
  echo Chu y: chi dung database thu nghiem moi va trong.
  exit /b 2
)
if not exist "package-lock.json" (
  echo [BLOCKED] Chua co package-lock.json that. Chay npm.cmd install tren may co Internet.
  exit /b 2
)
where docker >nul 2>&1 || (echo [BLOCKED] Can Docker Desktop da cai va chay. & exit /b 2)
set /p CONFIRM=Nhap TEST-ONLY neu ban dong y su dung database test RIENG (khong phai data that): 
if /I not "%CONFIRM%"=="TEST-ONLY" (
  echo Da huy kiem thu, khong thay doi database.
  exit /b 2
)
docker compose -f infrastructure\compose.test.yaml up -d || exit /b 1
call npm.cmd run check:release:full:testdb
if errorlevel 1 (
  echo [BLOCKED/FAIL] Xem docs\reports\release-v*-full-evidence.json
  exit /b 1
)
echo [PASS] Cac cong full-stack da chay. Can them danh gia a11y, bao mat va chuyen mon truoc production.
exit /b 0
