[CmdletBinding()]
param(
    [string]$DeployDirectory = (Join-Path $PSScriptRoot '../.deploy/local-staging'),
    [switch]$BuildLocal,
    [string]$ReleaseFile,
    [switch]$AllowLocalImages,
    [switch]$SkipMigration
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$directory = [IO.Path]::GetFullPath($DeployDirectory)
$settings = Join-Path $directory 'settings.env'
if (-not (Test-Path -LiteralPath $settings)) { throw 'Run Initialize-Local.ps1 first.' }
if (($BuildLocal -and $ReleaseFile) -or (-not $BuildLocal -and -not $ReleaseFile)) {
    throw 'Choose -BuildLocal OR -ReleaseFile.'
}
# Independent of GitHub concurrency: block simultaneous manual/runner deploys.
$lock = [IO.File]::Open((Join-Path $directory 'deploy.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
function Invoke-Docker {
    & docker @args
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed (exit $LASTEXITCODE)." }
}
try {
    Invoke-Docker info --format '{{.OSType}}'
    $releaseId = Get-Date -Format 'yyyyMMdd-HHmmss'
    $candidate = Join-Path $directory "release-$releaseId.env"
    if ($BuildLocal) {
        $tag = "local-$releaseId"
        Invoke-Docker build -t "futurecv-backend:$tag" (Join-Path $repo 'backend')
        Invoke-Docker build -t "futurecv-ai:$tag" (Join-Path $repo 'backend-ai')
        Invoke-Docker build -t "futurecv-frontend:$tag" (Join-Path $repo 'frontend')
        @("BACKEND_IMAGE=futurecv-backend:$tag", "AI_IMAGE=futurecv-ai:$tag", "FRONTEND_IMAGE=futurecv-frontend:$tag") |
            Set-Content -LiteralPath $candidate -Encoding utf8NoBOM
    } else {
        $lines = @(Get-Content -LiteralPath $ReleaseFile | Where-Object { $_.Trim() })
        if ($lines.Count -ne 3) { throw 'Release requires exactly three image references.' }
        foreach ($key in @('BACKEND_IMAGE','AI_IMAGE','FRONTEND_IMAGE')) {
            $pattern = "^${key}=ghcr\.io/[a-z0-9_./-]+@sha256:[a-f0-9]{64}$"
            if ($AllowLocalImages) {
                $service = $key.Replace('_IMAGE','').ToLowerInvariant()
                $pattern = "^${key}=futurecv-${service}:local-\d{8}-\d{6}$"
            }
            $matchesForKey = @($lines | Where-Object { $_ -cmatch $pattern })
            if ($matchesForKey.Count -ne 1) { throw "Invalid immutable image reference: $key" }
        }
        $lines | Set-Content -LiteralPath $candidate -Encoding utf8NoBOM
    }
    $compose = Join-Path $directory 'compose.yml'
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'compose.yml') -Destination $compose -Force
    $dc = @('compose','--project-name','futurecv-local-staging','--env-file',$settings,'--env-file',$candidate,'-f',$compose)
    Invoke-Docker @dc config --quiet
    if (-not $BuildLocal -and -not $AllowLocalImages) { Invoke-Docker @dc pull }
    Invoke-Docker @dc up -d --wait --wait-timeout 180 db ai
    # Backup before any schema mutation, even on an initially empty database.
    $backupDir = Join-Path $directory 'backups'
    New-Item -ItemType Directory -Force $backupDir | Out-Null
    Invoke-Docker @dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/predeploy.dump'
    Invoke-Docker @dc cp 'db:/tmp/predeploy.dump' (Join-Path $backupDir "$releaseId.dump")
    if (-not $SkipMigration) {
        Invoke-Docker @dc stop frontend backend
        Invoke-Docker @dc run --rm --no-deps backend --migrate-only
    }
    Invoke-Docker @dc up -d --wait --wait-timeout 240
    # nginx resolves a static upstream on startup. Refresh it after backend replacement,
    # including releases where the frontend image itself did not change.
    Invoke-Docker @dc up -d --no-deps --force-recreate --wait --wait-timeout 90 frontend
    $portLine = Get-Content -LiteralPath $settings | Where-Object { $_ -match '^HTTP_PORT=\d+$' }
    $port = ($portLine -split '=',2)[1]
    & (Join-Path $PSScriptRoot 'Test-Deployment.ps1') -BaseUrl "http://127.0.0.1:$port" -ComposeArguments $dc -SettingsFile $settings
    $current = Join-Path $directory 'current.env'
    if (Test-Path -LiteralPath $current) {
        Copy-Item -LiteralPath $current -Destination (Join-Path $directory 'previous.env') -Force
    }
    Copy-Item -LiteralPath $candidate -Destination $current -Force
    Write-Output "Deployment passed: http://127.0.0.1:$port; release $candidate"
} finally {
    $lock.Dispose()
}
