@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0backend"
chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
if "%APP_ENV%"=="" set APP_ENV=development
if "%REDIS_URL%"=="" set REDIS_URL=redis://127.0.0.1:6379/0
if "%TASK_QUEUE_ENABLED%"=="" set TASK_QUEUE_ENABLED=true
if "%TASK_QUEUE_EAGER%"=="" set TASK_QUEUE_EAGER=false

echo [AI Wardrobe] preparing backend on http://127.0.0.1:8000
echo.

:kill_port_8000
set "FOUND_PORT_8000=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":8000 .*LISTENING"') do (
  set "FOUND_PORT_8000=1"
  echo [AI Wardrobe] stopping old backend process PID %%P ...
  taskkill /PID %%P /F >nul 2>nul
)

if "!FOUND_PORT_8000!"=="1" (
  echo [AI Wardrobe] waiting for port 8000 to be released ...
  ping -n 3 127.0.0.1 >nul
  goto :kill_port_8000
)

echo [AI Wardrobe] port 8000 is clean.

call scripts\ensure_runtime.cmd backend
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to prepare the backend runtime.
  pause
  exit /b 1
)

echo.
echo [AI Wardrobe] APP_ENV=!APP_ENV!
echo [AI Wardrobe] REDIS_URL=!REDIS_URL!
echo [AI Wardrobe] TASK_QUEUE_ENABLED=!TASK_QUEUE_ENABLED! ^| TASK_QUEUE_EAGER=!TASK_QUEUE_EAGER!
echo.
echo [AI Wardrobe] opening API docs soon ...
start "" cmd /c "ping -n 6 127.0.0.1 >nul && start \"\" http://127.0.0.1:8000/docs"

echo [AI Wardrobe] starting FastAPI server ...
echo [AI Wardrobe] if the browser does not open automatically, visit http://127.0.0.1:8000/docs
echo.
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] backend failed to start.
  echo [AI Wardrobe] this window will stay open so you can read the error.
  pause
  exit /b 1
)
