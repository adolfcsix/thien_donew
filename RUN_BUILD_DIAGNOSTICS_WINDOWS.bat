@echo off
setlocal
cd /d "%~dp0"
echo === THIEN DO: BUILD DIAGNOSTICS ===
echo Kiem tra Node/npm, tao lockfile that va build. KHONG ghi/xoa data PostgreSQL.
where node >nul 2>&1 || (echo [BLOCKED] Can cai Node.js 22.13 tro len. & pause & exit /b 2)
node infrastructure\scripts\diagnose-build.mjs --install
set RESULT=%errorlevel%
echo.
echo Xem bao cao JSON va file LOG trong docs\reports.
echo Neu bi loi, kiem tra log co thong tin nhay cam truoc khi gui.
pause
exit /b %RESULT%
