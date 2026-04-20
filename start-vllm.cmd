@echo off
setlocal
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
cd /d "%~dp0"

if "%VLLM_HOST%"=="" set "VLLM_HOST=127.0.0.1"
if "%VLLM_PORT%"=="" set "VLLM_PORT=8001"
if "%VLLM_MODEL%"=="" set "VLLM_MODEL=Qwen/Qwen2.5-VL-7B-Instruct"
if "%VLLM_MAX_MODEL_LEN%"=="" set "VLLM_MAX_MODEL_LEN=8192"
if "%VLLM_GPU_MEMORY_UTILIZATION%"=="" set "VLLM_GPU_MEMORY_UTILIZATION=0.9"
if "%VLLM_CPU_KVCACHE_SPACE%"=="" set "VLLM_CPU_KVCACHE_SPACE=40"
if "%VLLM_CPU_NUM_OF_RESERVED_CPU%"=="" set "VLLM_CPU_NUM_OF_RESERVED_CPU=1"

echo [AI Wardrobe] local vLLM target URL: http://%VLLM_HOST%:%VLLM_PORT%/v1
echo [AI Wardrobe] model: %VLLM_MODEL%
echo [AI Wardrobe] CPU KV cache space: %VLLM_CPU_KVCACHE_SPACE% GB
echo.

where wsl >nul 2>nul
if errorlevel 1 (
  echo [AI Wardrobe] WSL was not found.
  echo [AI Wardrobe] Please start vLLM manually using the command in docs\local-vllm.md
  echo.
  echo python -m vllm.entrypoints.openai.api_server --host 0.0.0.0 --port %VLLM_PORT% --model %VLLM_MODEL% --max-model-len %VLLM_MAX_MODEL_LEN% --gpu-memory-utilization %VLLM_GPU_MEMORY_UTILIZATION%
  pause
  exit /b 1
)

echo [AI Wardrobe] starting vLLM in WSL ...
echo [AI Wardrobe] stop with Ctrl+C in this window when you are done.
echo.
wsl bash -lc "set -e; if [ -x ~/.venvs/ai-wardrobe-vllm/bin/python ]; then source ~/.venvs/ai-wardrobe-vllm/bin/activate; elif ! python3 -c 'import vllm' >/dev/null 2>&1; then echo '[AI Wardrobe] vLLM is not installed. Run install-vllm-wsl.cmd first.'; exit 1; fi; TC_PATH=$(find /usr/lib -name 'libtcmalloc_minimal.so.4' 2>/dev/null | head -n 1); if [ -n \"$TC_PATH\" ]; then export LD_PRELOAD=\"$TC_PATH:$LD_PRELOAD\"; fi; export VLLM_CPU_KVCACHE_SPACE=%VLLM_CPU_KVCACHE_SPACE%; export VLLM_CPU_NUM_OF_RESERVED_CPU=%VLLM_CPU_NUM_OF_RESERVED_CPU%; python3 -m vllm.entrypoints.openai.api_server --host 0.0.0.0 --port %VLLM_PORT% --model '%VLLM_MODEL%' --max-model-len %VLLM_MAX_MODEL_LEN% --dtype bfloat16 --limit-mm-per-prompt image=1"
