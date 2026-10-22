@echo off
setlocal
cd /d "%~dp0"
echo =====================================================
echo THIEN DO - KIEM TRA DIEU KIEN BUILD, KHONG CAI DAT
 echo =====================================================
where node >nul 2>&1 || (echo [BLOCKED] Can cai Node.js 22.13 tro len. & pause & exit /b 2)
node infrastructure\scripts\release-readiness.mjs
set RESULT=%ERRORLEVEL%
echo.
if not "%RESULT%"=="0" (
  echo Neu thieu package-lock.json, ket noi mang roi chay PREPARE_LOCKFILE_WINDOWS.bat
  echo Hoac chay GitHub Actions: Bootstrap lockfile and validate full-stack.
)
echo [NOTE] Kiem tra nay khong chay build, PostgreSQL E2E hay deploy.
pause
exit /b %RESULT%
