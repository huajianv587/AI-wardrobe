@echo off
setlocal
cd /d "%~dp0frontend"

echo [AI Wardrobe] starting frontend on http://localhost:3000
echo.

call npm.cmd install
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] npm install failed.
  pause
  exit /b 1
)

call npm.cmd run dev

