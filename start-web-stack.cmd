@echo off
setlocal
cd /d "%~dp0"

echo [AI Wardrobe] opening frontend and backend in separate windows...

start "AI Wardrobe Backend" cmd /k "%~dp0start-backend.cmd"
start "AI Wardrobe Frontend" cmd /k "%~dp0start-frontend.cmd"

echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
echo If the pages do not open automatically, paste the addresses into your browser.
echo.
pause
