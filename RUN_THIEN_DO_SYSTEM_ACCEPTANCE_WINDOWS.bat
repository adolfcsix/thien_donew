@echo off
setlocal
cd /d "%~dp0"
echo THIEN DO - LOCAL SOFTWARE ACCEPTANCE
echo This does not certify production, real OAuth, browser layout or native PostgreSQL.
echo First install dependencies with npm.cmd ci --no-audit --no-fund.
echo SQL needs THIENDO_SQL_TEST_MODULE. See HUONG_DAN.md.
call npm.cmd run check:system:local
set "THIENDO_CHECK_EXIT=%ERRORLEVEL%"
echo.
echo Acceptance exit code: %THIENDO_CHECK_EXIT%
pause
exit /b %THIENDO_CHECK_EXIT%
