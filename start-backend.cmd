@echo off
setlocal
cd /d "%~dp0backend"

echo [AI Wardrobe] starting backend on http://localhost:8000
echo.

if exist ".venv\Scripts\python.exe" (
  .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  exit /b %errorlevel%
)

echo [AI Wardrobe] backend virtualenv not found, creating one...
py -m venv .venv
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to create virtual environment.
  pause
  exit /b 1
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

