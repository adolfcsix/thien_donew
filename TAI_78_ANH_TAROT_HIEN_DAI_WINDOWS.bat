@echo off
setlocal
cd /d "%~dp0"
echo THIEN DO - TAI 78 ANH TAROT GEARBERRY MODERN CC BY 4.0
where node >nul 2>nul
if errorlevel 1 (
  echo LOI: Chua cai Node.js 22 tro len.
  pause
  exit /b 1
)
node infrastructure\scripts\install-tarot-modern-images.mjs
if errorlevel 1 (
  echo.
  echo Tai anh chua hoan tat. Kiem tra Internet va thu lai.
  pause
  exit /b 1
)
echo.
echo Hoan tat. Hay khoi dong lai website de su dung anh offline.
pause
