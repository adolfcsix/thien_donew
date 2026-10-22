@echo off
setlocal
cd /d "%~dp0"
echo ===============================================
echo THIEN DO - KIEM TRA DIEU KIEN BUILD (AN TOAN)
echo ===============================================
where node >nul 2>&1 || (echo [BLOCKED] Cai Node.js ^>=22.13.0 && exit /b 2)
where npm.cmd >nul 2>&1 || (echo [BLOCKED] Cai npm && exit /b 2)
call npm.cmd run audit:workspaces
if errorlevel 1 goto :failed
call npm.cmd run audit:release-metadata
if errorlevel 1 goto :failed
call npm.cmd run check:readiness
if errorlevel 1 goto :blocked
call npm.cmd run check:lockfile
if errorlevel 1 goto :blocked
echo [READY FOR BUILD TEST] Lockfile / dependencies da phat hien.
echo Quan trong: CHUA co bang chung build/E2E PASS.
echo Tiep tuc: npm.cmd run typecheck ^&^& npm.cmd run build
exit /b 0
:blocked
echo [BLOCKED] Moi truong chua du phu thuoc hoac lockfile.
echo Chay PREPARE_LOCKFILE_WINDOWS.bat khi co mang npm.
echo Hoac START_GITHUB_BUILD_WINDOWS.bat (chi dung repo PRIVATE).
exit /b 2
:failed
echo [FAILED] Cau truc ma nguon hoac metadata chua hop le.
exit /b 1
