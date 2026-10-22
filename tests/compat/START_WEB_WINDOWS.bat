@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [THIEN DO V7] Node.js 22+ chua duoc cai. Tai tai https://nodejs.org/
  pause
  exit /b 1
)
echo [THIEN DO V7] Kiem tra Node.js:
node --version
echo.
echo Web dang chay tai http://127.0.0.1:8080
start "" http://127.0.0.1:8080
node apps/api/src/server.cjs
pause
