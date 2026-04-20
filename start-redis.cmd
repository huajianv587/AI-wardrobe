@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
chcp 65001 >nul

set "REDIS_CONTAINER=ai-wardrobe-local-redis"
set "REDIS_IMAGE=redis:7-alpine"
set "REDIS_PORT=6379"

echo [AI Wardrobe] checking local Docker Redis broker ...
echo.

docker version >nul 2>nul
if errorlevel 1 (
  echo [AI Wardrobe] Docker Desktop is required for the local Redis broker.
  echo [AI Wardrobe] Start Docker Desktop first, then run this script again.
  pause
  exit /b 1
)

set "REDIS_CONTAINER_ID="
for /f %%I in ('docker ps -aq --filter "name=%REDIS_CONTAINER%"') do set "REDIS_CONTAINER_ID=%%I"

if defined REDIS_CONTAINER_ID (
  for /f %%S in ('docker inspect -f "{{.State.Running}}" %REDIS_CONTAINER%') do set "REDIS_RUNNING=%%S"
  if /i "!REDIS_RUNNING!"=="true" (
    echo [AI Wardrobe] Redis container %REDIS_CONTAINER% is already running.
  ) else (
    echo [AI Wardrobe] starting existing Redis container %REDIS_CONTAINER% ...
    docker start %REDIS_CONTAINER% >nul
    if errorlevel 1 (
      echo [AI Wardrobe] failed to start the existing Redis container.
      pause
      exit /b 1
    )
  )
) else (
  echo [AI Wardrobe] creating Redis container %REDIS_CONTAINER% on port %REDIS_PORT% ...
  docker run -d --name %REDIS_CONTAINER% -p %REDIS_PORT%:6379 %REDIS_IMAGE% redis-server --appendonly yes >nul
  if errorlevel 1 (
    echo [AI Wardrobe] failed to create the Redis container.
    pause
    exit /b 1
  )
)

docker exec %REDIS_CONTAINER% redis-cli ping >nul 2>nul
if errorlevel 1 (
  echo [AI Wardrobe] Redis container started, but ping has not passed yet.
  echo [AI Wardrobe] try again in a few seconds if the backend still cannot connect.
  pause
  exit /b 1
)

echo [AI Wardrobe] Redis is ready at redis://127.0.0.1:%REDIS_PORT%/0
echo.
