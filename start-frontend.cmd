@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0frontend"

echo [AI Wardrobe] preparing frontend on http://127.0.0.1:3000
echo.

:kill_port_3000
set "FOUND_PORT_3000=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  set "FOUND_PORT_3000=1"
  echo [AI Wardrobe] stopping old frontend process PID %%P ...
  taskkill /PID %%P /F >nul 2>nul
)

if "!FOUND_PORT_3000!"=="1" (
  echo [AI Wardrobe] waiting for port 3000 to be released ...
  ping -n 3 127.0.0.1 >nul
  goto :kill_port_3000
)

echo [AI Wardrobe] port 3000 is clean.
echo [AI Wardrobe] checking dependencies ...
set "NEED_INSTALL=0"

if not exist node_modules (
  set "NEED_INSTALL=1"
)

if not exist node_modules\next (
  set "NEED_INSTALL=1"
)

if not exist node_modules\react (
  set "NEED_INSTALL=1"
)

if not exist node_modules\react-dom (
  set "NEED_INSTALL=1"
)

if "!NEED_INSTALL!"=="1" (
  echo [AI Wardrobe] dependencies missing, running npm install ...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo [AI Wardrobe] npm install failed.
    echo [AI Wardrobe] please keep this window open and read the error above.
    pause
    exit /b 1
  )
) else (
  echo [AI Wardrobe] dependencies already present, skipping npm install.
)

echo.
echo [AI Wardrobe] opening browser soon ...
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://127.0.0.1:3000'"

echo [AI Wardrobe] starting Next.js dev server ...
echo [AI Wardrobe] if the browser does not open automatically, visit http://127.0.0.1:3000
echo.
call npm.cmd run dev
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] frontend failed to start.
  echo [AI Wardrobe] this window will stay open so you can read the error.
  pause
  exit /b 1
)
