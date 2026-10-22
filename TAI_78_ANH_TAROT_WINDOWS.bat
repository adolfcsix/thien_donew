@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Đang tải 78 ảnh Tarot Rider-Waite-Smith năm 1909...
where node >nul 2>&1
if errorlevel 1 (echo [ERROR] Cần cài Node.js 22 trở lên. & pause & exit /b 1)
node infrastructure\scripts\install-tarot-rws-images.mjs
if errorlevel 1 (echo Chưa tải đủ ảnh. Kiểm tra mạng và chạy lại sau. & pause & exit /b 1)
echo Xong. Khởi động lại web nếu đang chạy production build.
pause
