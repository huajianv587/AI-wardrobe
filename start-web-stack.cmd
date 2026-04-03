@echo off
setlocal
cd /d "%~dp0"

echo [AI Wardrobe] starting backend and frontend in separate windows...
echo.

start "AI Wardrobe Backend" cmd /k call "%~dp0start-backend.cmd"
ping -n 2 127.0.0.1 >nul
start "AI Wardrobe Frontend" cmd /k call "%~dp0start-frontend.cmd"

echo [AI Wardrobe] both launch windows were opened.
echo.
echo Frontend: http://127.0.0.1:3000
echo Backend:  http://127.0.0.1:8000/docs
echo.
echo [AI Wardrobe] a browser window should open automatically after startup.
echo [AI Wardrobe] if not, copy the addresses above into your browser.
echo.
pause
