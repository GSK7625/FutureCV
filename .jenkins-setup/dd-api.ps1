param(
  [string]$Method = "GET",
  [string]$Path = "/kubernetes",
  [string]$Body = ""
)

$pipe = New-Object System.IO.Pipes.NamedPipeClientStream('.', 'dockerBackendApiServer', [System.IO.Pipes.PipeDirection]::InOut)
$pipe.Connect(5000)

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
$head = "$Method $Path HTTP/1.1`r`nHost: localhost`r`nContent-Type: application/json`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
$headBytes = [System.Text.Encoding]::UTF8.GetBytes($head)

$all = New-Object byte[] ($headBytes.Length + $bodyBytes.Length)
[Array]::Copy($headBytes, 0, $all, 0, $headBytes.Length)
if ($bodyBytes.Length -gt 0) { [Array]::Copy($bodyBytes, 0, $all, $headBytes.Length, $bodyBytes.Length) }

$pipe.Write($all, 0, $all.Length)
$pipe.Flush()

$sr = New-Object System.IO.StreamReader($pipe)
$out = $sr.ReadToEnd()
$pipe.Close()
$out
