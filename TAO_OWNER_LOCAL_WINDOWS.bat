@echo off
chcp 65001 >nul
setlocal DisableDelayedExpansion
cd /d "%~dp0"
title THIEN DO - Tao tai khoan Owner (localhost)
echo.
echo =============================================
echo   THIEN DO - TAO OWNER CHO MAY LOCAL
 echo =============================================
echo.
where node >nul 2>&1
if errorlevel 1 (
 echo [LOI] Chua cai Node.js. Can Node 22.13 tro len.
 goto :end
)
if not exist ".env" (
 echo [LOI] Thieu .env. Hay sao chep .env tu du an dang chay.
 echo Chi voi database MOI: copy .env.example .env
 goto :end
)
if not exist "node_modules\pg" (
 echo [LOI] Chua cai thu vien. Hay chay npm.cmd ci tai thu muc thien-do.
 goto :end
)
echo Can ket noi Docker PostgreSQL dang chay, va da chay migrations.
echo Lenh tham khao: npm.cmd run db:migrate
echo.
set /p "OWNER_EMAIL=Email cua ban de tao Owner: "
if not defined OWNER_EMAIL (
 echo [HUY] Chua nhap email.
 goto :end
)
node --env-file=.env infrastructure/scripts/create-local-owner.mjs --email "%OWNER_EMAIL%"
:end
echo.
pause
