@echo off
setlocal
cd /d "%~dp0"
call npm.cmd run check:lockfile
if errorlevel 1 exit /b 1
call npm.cmd run audit:migration-chain
if errorlevel 1 exit /b 1
call npm.cmd run check:source
if errorlevel 1 exit /b 1
call npm.cmd run typecheck
if errorlevel 1 exit /b 1
call npm.cmd test
if errorlevel 1 exit /b 1
call npm.cmd run build
if errorlevel 1 exit /b 1
echo Source checks passed. Native DB and providers require separate acceptance.
