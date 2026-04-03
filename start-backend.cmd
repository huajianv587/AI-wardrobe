@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0backend"

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

if not exist ".venv\Scripts\python.exe" (
  echo [AI Wardrobe] backend virtualenv not found, creating one...
  py -m venv .venv
  if errorlevel 1 (
    echo.
    echo [AI Wardrobe] failed to create virtual environment.
    pause
    exit /b 1
  )
)

echo [AI Wardrobe] checking Python dependencies ...
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to upgrade pip.
  pause
  exit /b 1
)

.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to install backend requirements.
  pause
  exit /b 1
)

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
