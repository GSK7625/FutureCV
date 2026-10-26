[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://127.0.0.1:8080',
    [string]$SettingsFile,
    [string[]]$ComposeArguments
)
$ErrorActionPreference = 'Stop'
foreach ($path in @('/','/login','/healthz','/health/ready','/api/jobs')) {
    $response = Invoke-WebRequest -Uri "$BaseUrl$path" -TimeoutSec 20
    if ($response.StatusCode -ne 200) { throw "Smoke check failed: $path" }
    if ($path -in @('/','/login') -and $response.Content -notmatch '<html') {
        throw "SPA response missing HTML: $path"
    }
    if ($path -eq '/api/jobs' -and $response.Headers['Content-Type'] -notmatch 'application/json') {
        throw 'API proxy returned HTML instead of JSON.'
    }
    Write-Output "PASS $path"
}
if ($SettingsFile) {
    $admin = @{}
    Get-Content -LiteralPath $SettingsFile | ForEach-Object {
        $pair = $_ -split '=', 2
        if ($pair[0] -in @('ADMIN_EMAIL','ADMIN_PASSWORD')) { $admin[$pair[0]] = $pair[1] }
    }
    $body = @{ email = $admin.ADMIN_EMAIL; password = $admin.ADMIN_PASSWORD } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 20
    if ($login.role -ne 'Admin' -or -not $login.accessToken) { throw 'Admin login failed.' }
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/admin/users" -Headers @{ Authorization = "Bearer $($login.accessToken)" } -TimeoutSec 20
    if ($response.StatusCode -ne 200) { throw 'Admin authorization failed.' }
    Write-Output 'PASS configured admin login and authorization (credentials/token not logged)'
}
if ($ComposeArguments) {
    & docker @ComposeArguments exec -T ai python -c "import urllib.request,json; r=json.load(urllib.request.urlopen('http://127.0.0.1:8000/ready',timeout=5)); assert r['status']=='ready'"
    if ($LASTEXITCODE -ne 0) { throw 'AI readiness failed.' }
    & docker @ComposeArguments exec -T backend curl --fail --silent --output /dev/null http://ai:8000/ready
    if ($LASTEXITCODE -ne 0) { throw 'Backend cannot reach AI.' }
    Write-Output 'PASS backend to AI connectivity'
}
