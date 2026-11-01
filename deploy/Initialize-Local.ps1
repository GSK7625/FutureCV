[CmdletBinding()]
param(
    [string]$DeployDirectory = (Join-Path $PSScriptRoot '../.deploy/local-staging'),
    [ValidateRange(1024,65535)][int]$Port = 8080
)
$ErrorActionPreference = 'Stop'
$directory = [IO.Path]::GetFullPath($DeployDirectory)
New-Item -ItemType Directory -Force $directory | Out-Null
$settings = Join-Path $directory 'settings.env'
if (Test-Path -LiteralPath $settings) {
    throw 'settings.env already exists; keep existing database credentials. No files overwritten.'
}
function New-Secret {
    return [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
}
@(
    "HTTP_PORT=$Port"
    "POSTGRES_PASSWORD=$(New-Secret)"
    "JWT_KEY=$(New-Secret)"
    "INTERNAL_API_KEY=$(New-Secret)"
    'ADMIN_EMAIL=admin@futurecv.local'
    "ADMIN_PASSWORD=Fcv!9a$(New-Secret)"
) | Set-Content -LiteralPath $settings -Encoding utf8NoBOM
# Restrict the secrets file to this Windows account and SYSTEM.
if ($IsWindows) {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls.exe $settings /inheritance:r /grant:r "${identity}:(F)" 'SYSTEM:(F)' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Failed to restrict settings.env permissions' }
}
Write-Output "Initialized local-staging at $directory. Credentials are in settings.env; do not commit or share it."
