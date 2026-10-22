@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0infrastructure\scripts\launch-github-build.ps1"
set RESULT=%ERRORLEVEL%
echo.
if not "%RESULT%"=="0" echo A problem occurred. See messages above.
pause
exit /b %RESULT%
