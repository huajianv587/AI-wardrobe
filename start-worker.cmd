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

echo [AI Wardrobe] preparing backend worker
echo.

call scripts\ensure_runtime.cmd worker
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to prepare the worker runtime.
  pause
  exit /b 1
)

echo.
echo [AI Wardrobe] APP_ENV=!APP_ENV!
echo [AI Wardrobe] REDIS_URL=!REDIS_URL!
echo [AI Wardrobe] TASK_QUEUE_ENABLED=!TASK_QUEUE_ENABLED! ^| TASK_QUEUE_EAGER=!TASK_QUEUE_EAGER!
echo [AI Wardrobe] starting RQ worker ...
echo.
.venv\Scripts\python.exe worker.py
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] worker failed to start.
  echo [AI Wardrobe] this window will stay open so you can read the error.
  pause
  exit /b 1
)
