@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js chua duoc cai. Hay cai Node.js 20+ tu https://nodejs.org/
  echo Sau do mo lai file KHOI_DONG_LIVE_PC.cmd
  pause
  exit /b 1
)
node tools\start-pc-live.js
if errorlevel 1 (
  echo Khoi dong that bai. Kiem tra lai Node.js hoac cong 4173.
)
pause
