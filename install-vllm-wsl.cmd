@echo off
setlocal
cd /d "%~dp0"

echo [AI Wardrobe] preparing local vLLM environment in WSL ...
echo [AI Wardrobe] CPU-only mode will install the CPU wheel path recommended by vLLM docs.
echo.

where wsl >nul 2>nul
if errorlevel 1 (
  echo [AI Wardrobe] WSL was not found on this machine.
  pause
  exit /b 1
)

wsl bash -lc "set -e; apt-get update; apt-get install -y python3-pip python3-venv build-essential libtcmalloc-minimal4; rm -rf ~/.venvs/ai-wardrobe-vllm; mkdir -p ~/.venvs; python3 -m venv ~/.venvs/ai-wardrobe-vllm; source ~/.venvs/ai-wardrobe-vllm/bin/activate; pip install --upgrade pip wheel setuptools uv; uv pip install vllm --extra-index-url https://wheels.vllm.ai/nightly/cpu --index-strategy first-index --torch-backend cpu"
if errorlevel 1 (
  echo.
  echo [AI Wardrobe] failed to install vLLM inside WSL.
  echo [AI Wardrobe] Please read docs\local-vllm.md and check your WSL CPU environment.
  pause
  exit /b 1
)

echo.
echo [AI Wardrobe] CPU vLLM installation finished in WSL.
echo [AI Wardrobe] You can now run start-vllm.cmd
pause
