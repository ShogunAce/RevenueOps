$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
try {
  $response = Invoke-WebRequest 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2
  if ($response.StatusCode -eq 200) { Write-Host 'Server already available at http://127.0.0.1:5173/'; exit 0 }
} catch {}
$node = (Get-Command node).Source
Start-Process -FilePath $node -ArgumentList 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput "$PSScriptRoot/server.log" -RedirectStandardError "$PSScriptRoot/server-error.log"
Write-Host 'Starting RevenueOps at http://127.0.0.1:5173/. See server.log for status.'
