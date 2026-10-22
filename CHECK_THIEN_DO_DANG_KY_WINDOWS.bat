@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo [BLOCKED] Can cai Node.js 22.13+ & exit /b 2)
echo Chan doan dang ky tai khoan THIEN DO - READ ONLY, khong tao tai khoan, khong thay doi database.
node --env-file-if-exists=.env infrastructure\scripts\diagnose-registration.mjs
exit /b %errorlevel%
