@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
where node >nul 2>&1 || (echo Can cai Node.js 22.13+ & pause & exit /b 2)
node infrastructure\scripts\check-customization.mjs
if errorlevel 1 (pause & exit /b 1)
where npm.cmd >nul 2>&1 || (echo Can cai npm & pause & exit /b 2)
call npm.cmd run typecheck
if errorlevel 1 (pause & exit /b 1)
echo Kiem tra du lieu va TypeScript da xong. Hay mo web de kiem tra giao dien.
pause
exit /b 0
