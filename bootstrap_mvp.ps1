param(
    [switch]$Force
)

$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    $ProjectRoot = (Get-Location).Path
}

Set-Location -LiteralPath $ProjectRoot

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $fullPath = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path -LiteralPath $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    }
}

function Ensure-TextFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )

    $fullPath = Join-Path $ProjectRoot $RelativePath
    $directory = Split-Path -Parent $fullPath
    if ($directory) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    if ((Test-Path -LiteralPath $fullPath) -and -not $Force) {
        return
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($fullPath, $Content, $utf8NoBom)
}

function Ensure-GitKeep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativeDirectory
    )

    $directory = Join-Path $ProjectRoot $RelativeDirectory
    if (-not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    $gitKeepPath = Join-Path $directory ".gitkeep"
    if (-not (Test-Path -LiteralPath $gitKeepPath)) {
        New-Item -ItemType File -Path $gitKeepPath -Force | Out-Null
    }
}

$directories = @(
    "frontend",
    "frontend/app",
    "frontend/components",
    "frontend/components/wardrobe",
    "frontend/components/avatar-3d",
    "frontend/components/outfit",
    "frontend/components/ui",
    "frontend/hooks",
    "frontend/lib",
    "frontend/store",
    "frontend/styles",
    "backend",
    "backend/app",
    "backend/app/api",
    "backend/app/api/v1",
    "backend/app/api/v1/endpoints",
    "backend/app/models",
    "backend/app/schemas",
    "backend/core",
    "backend/db",
    "backend/services",
    "backend/tests",
    "ai-services",
    "training",
    "model_training",
    "model_training/checkpoints",
    "infra",
    "infra/docker",
    "infra/nginx",
    "infra/supabase",
    "docs",
    "miniprogram"
)

foreach ($directory in $directories) {
    Ensure-Directory -RelativePath $directory
}

$gitKeepDirectories = @(
    "ai-services",
    "training",
    "model_training/checkpoints",
    "infra/docker",
    "infra/nginx",
    "miniprogram"
)

foreach ($directory in $gitKeepDirectories) {
    Ensure-GitKeep -RelativeDirectory $directory
}

Ensure-TextFile -RelativePath "docs/README.md" -Content @'
# Project Docs

- `architecture.md`: system and service layout
- `api-spec.md`: API contract notes
- `supabase-setup.md`: cloud backup setup
'@

Ensure-TextFile -RelativePath "docs/architecture.md" -Content @'
# Architecture

AI Wardrobe uses a local-first architecture:

- Next.js frontend for wardrobe, recommendation, and try-on flows
- FastAPI backend for CRUD, image processing, and sync orchestration
- SQLite as the primary local data store
- Supabase as optional cloud backup for metadata and assets
- AI cleanup service via HTTP when configured, with a local fallback path
'@

Ensure-TextFile -RelativePath "docs/api-spec.md" -Content @'
# API Notes

Key wardrobe endpoints:

- `GET /api/v1/wardrobe/items`
- `POST /api/v1/wardrobe/items`
- `PUT /api/v1/wardrobe/items/{item_id}`
- `POST /api/v1/wardrobe/items/{item_id}/upload-image`
- `POST /api/v1/wardrobe/items/{item_id}/process-image`
- `DELETE /api/v1/wardrobe/items/{item_id}`
'@

Ensure-TextFile -RelativePath "model_training/README.md" -Content @'
# Model Training

Place your fine-tuned checkpoints, exported adapters, and evaluation artifacts here.

Recommended folders:

- `checkpoints/`
- `outputs/`
- `datasets/`
'@

Ensure-TextFile -RelativePath "infra/docker-compose.yml" -Content @'
services:
  app-placeholder:
    image: alpine:3.20
    command: ["sh", "-c", "echo AI Wardrobe infra placeholder"]
'@

Write-Host "AI Wardrobe scaffold sync completed."
Write-Host "Directories and placeholder docs are ensured."
if ($Force) {
    Write-Host "Force mode was enabled, so scaffold text files were refreshed."
} else {
    Write-Host "Existing source files were left untouched."
}
