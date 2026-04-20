@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
if "%APP_ENV%"=="" set APP_ENV=development
if "%REDIS_URL%"=="" set REDIS_URL=redis://127.0.0.1:6379/0
if "%TASK_QUEUE_ENABLED%"=="" set TASK_QUEUE_ENABLED=true
if "%TASK_QUEUE_EAGER%"=="" set TASK_QUEUE_EAGER=false

echo [AI Wardrobe] preparing Redis, backend, worker, and frontend...
echo.

call "%~dp0start-redis.cmd"
if errorlevel 1 exit /b 1

start "AI Wardrobe Backend" cmd /k call "%~dp0start-backend.cmd"
ping -n 2 127.0.0.1 >nul
start "AI Wardrobe Worker" cmd /k call "%~dp0start-worker.cmd"
ping -n 2 127.0.0.1 >nul
start "AI Wardrobe Frontend" cmd /k call "%~dp0start-frontend.cmd"

echo [AI Wardrobe] launch windows were opened for backend, worker, and frontend.
echo.
echo Frontend: http://127.0.0.1:3000
echo Backend:  http://127.0.0.1:8000/docs
echo Redis:    redis://127.0.0.1:6379/0
echo.
echo [AI Wardrobe] a browser window should open automatically after startup.
echo [AI Wardrobe] if not, copy the addresses above into your browser.
echo.
pause
