@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0infrastructure\scripts\get-github-build-results.ps1"
set RESULT=%ERRORLEVEL%
echo.
if not "%RESULT%"=="0" echo Check the above messages and your GitHub Actions run.
pause
exit /b %RESULT%
