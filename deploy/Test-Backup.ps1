[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BackupFile,
    [string]$DeployDirectory = (Join-Path $PSScriptRoot '../.deploy/local-staging')
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($DeployDirectory)
$dc = @('compose','--project-name','futurecv-local-staging','--env-file',"$root/settings.env",'--env-file',"$root/current.env",'-f',"$root/compose.yml")
if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) { throw 'Backup file not found.' }
function Invoke-Docker {
    & docker @args
    if ($LASTEXITCODE -ne 0) { throw "Backup verification command failed: exit $LASTEXITCODE" }
}
$testDatabase = 'futurecv_restore_check_' + [Guid]::NewGuid().ToString('N')
$created = $false
try {
    Invoke-Docker @dc cp ([IO.Path]::GetFullPath($BackupFile)) 'db:/tmp/restore-check.dump'
    Invoke-Docker @dc exec -T db createdb -U futurecv $testDatabase
    $created = $true
    Invoke-Docker @dc exec -T db pg_restore --exit-on-error --no-owner -U futurecv -d $testDatabase /tmp/restore-check.dump
    $migrationCount = Invoke-Docker @dc exec -T db psql -U futurecv -d $testDatabase -At -c 'SELECT count(*) FROM "__EFMigrationsHistory";'
    $userCount = Invoke-Docker @dc exec -T db psql -U futurecv -d $testDatabase -At -c 'SELECT count(*) FROM "AspNetUsers";'
    if ([int]$migrationCount -le 0 -or [int]$userCount -le 0) { throw 'Restored database does not contain expected schema and users.' }
    Write-Output "PASS backup restored to isolated database: $migrationCount migrations, $userCount users."
} finally {
    if ($created) {
        Invoke-Docker @dc exec -T db dropdb -U futurecv $testDatabase
        Write-Output 'Removed temporary restore-check database; application database unchanged.'
    }
}
