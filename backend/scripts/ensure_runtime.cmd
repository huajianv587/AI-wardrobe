@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

set "ROLE=%~1"
if "%ROLE%"=="" set "ROLE=backend runtime"

set "PYTHON_BIN=python"
where py >nul 2>nul && set "PYTHON_BIN=py"

if not exist ".venv\Scripts\python.exe" (
  echo [AI Wardrobe] backend virtualenv not found, creating one...
  %PYTHON_BIN% -m venv .venv
  if errorlevel 1 (
    echo.
    echo [AI Wardrobe] failed to create virtual environment for %ROLE%.
    exit /b 1
  )
)

set "REQ_HASH="
for /f "skip=1 delims=" %%H in ('certutil -hashfile requirements.txt SHA256 ^| findstr /r "^[0-9A-Fa-f]"') do (
  if not defined REQ_HASH set "REQ_HASH=%%H"
)
set "REQ_HASH=!REQ_HASH: =!"
set "STAMP_FILE=.venv\.requirements.sha256"
set "INSTALL_DEPS=1"

if defined REQ_HASH if exist "!STAMP_FILE!" (
  set /p STORED_HASH=<"!STAMP_FILE!"
  if /i "!STORED_HASH!"=="!REQ_HASH!" set "INSTALL_DEPS=0"
)

if "!INSTALL_DEPS!"=="0" (
  echo [AI Wardrobe] Python dependencies for %ROLE% are already up to date.
  exit /b 0
)

echo [AI Wardrobe] checking Python dependencies for %ROLE% ...
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to upgrade pip for %ROLE%.
  exit /b 1
)

.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to install backend requirements for %ROLE%.
  exit /b 1
)

if defined REQ_HASH >"!STAMP_FILE!" echo !REQ_HASH!
exit /b 0
