@echo off
setlocal
cd /d "%~dp0"
echo THIEN DO - QIMEN BROWSER ROUND TRIP - TEST DATABASE ONLY
if not exist ".env.e2e" (echo [BLOCKED] Copy .env.e2e.example to .env.e2e and configure isolated test DB. & exit /b 2)
where node >nul 2>&1 || (echo [BLOCKED] Node.js 22.13+ required. & exit /b 2)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] npm required. & exit /b 2)
node -e "require.resolve('playwright')" >nul 2>&1
if errorlevel 1 (
 echo [BLOCKED] Install optional browser tools: npm.cmd install --no-save --package-lock=false playwright
 echo Then run: npx.cmd playwright install chromium
 exit /b 2
)
echo Requires migrated EMPTY test DB and running test API + Next.js.
echo This test checks actual database identity before creating disposable accounts.
call npm.cmd run test:qimen:browser
if errorlevel 1 exit /b 1
echo Kiểm thử thêm xác nhận Dụng thần và chứng cứ V11.110.1
call npm.cmd run test:qimen:question:browser
exit /b %errorlevel%

