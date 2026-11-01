param(
    [string]$Container = "jenkins",
    [string]$Network = "kind"
)

# Check if already connected
$connected = docker inspect $Container --format '{{json .NetworkSettings.Networks}}' | ConvertFrom-Json | `
    ForEach-Object { $_.PSObject.Properties.Name -contains $Network }

if ($connected) {
    Write-Output "Container $Container already connected to $Network"
    exit 0
}

# Try to connect
$err = docker network connect $Network $Container 2>&1
if ($LASTEXITCODE -ne 0) {
    # Maybe the kind network doesn't exist yet (Docker Desktop restarted)
    # Wait a bit and retry once
    Start-Sleep -Seconds 5
    $err = docker network connect $Network $Container 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Output "SUCCESS: Connected $Container to $Network"
    # Verify
    $nodes = docker exec $Container bash -c "curl -sk --max-time 5 https://172.19.0.2:6443/version 2>&1 | head -1"
    if ($nodes -match '"major"') {
        Write-Output "K8s API reachable: $nodes"
    } else {
        Write-Output "WARN: K8s API not reachable yet: $nodes"
    }
} else {
    Write-Output "FAILED to connect: $err"
    exit 1
}
