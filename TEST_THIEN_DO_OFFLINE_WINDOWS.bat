@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================
echo THIEN DO - CHAY TEST SOURCE OFFLINE, KHONG CAI PACKAGE
 echo ==============================================================
where node >nul 2>&1 || (
  echo [BLOCKED] Chua co Node.js 22.13+.
  pause
  exit /b 2
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22||(major===22&&minor>=13)?0:1)"
if errorlevel 1 (
  echo [BLOCKED] Node.js phai la phien ban 22.13 tro len.
  pause
  exit /b 2
)
node infrastructure\scripts\offline-workspace-tests.mjs
set RESULT=%ERRORLEVEL%
echo.
if "%RESULT%"=="0" (
  echo [PASS] Node source tests PASS, NHUNG CHUA PHAI BUILD / E2E.
) else (
  echo [BLOCKED] Xem docs\reports\offline-workspace\summary.json
  echo Cai dung dependencies bang npm.cmd ci khi co Internet, roi test/build lai.
)
pause
exit /b %RESULT%
