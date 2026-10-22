@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo THIEN DO - KIEM TRA MANG NPM, KHONG CAI DAT
echo ==============================================
where node >nul 2>&1 || (echo [BLOCKED] Can cai Node.js 22.13+ & pause & exit /b 2)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] Can cai npm & pause & exit /b 2)
node infrastructure\scripts\registry-preflight.mjs
set RESULT=%ERRORLEVEL%
if not "%RESULT%"=="0" (
  echo.
  echo Khong phai ket luan Next.js / NestJS bi loi.
  echo Neu DNS bi chan, thu mang khac hoac GitHub Actions o repo private.
) else (
  echo.
  echo Co ket noi npm. De cai va build: PREPARE_LOCKFILE_WINDOWS.bat
)
pause
exit /b %RESULT%
