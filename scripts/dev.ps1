param([switch]$Stop)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
$stateFile = Join-Path $localRoot 'dev-processes.json'

if ($Stop) {
    if (Test-Path -LiteralPath $stateFile) {
        $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
        foreach ($pidValue in @($state.backend, $state.frontend)) {
            $process = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
            if ($process -and $process.CommandLine -like "*$projectRoot*") {
                Stop-Process -Id $pidValue -ErrorAction SilentlyContinue
            }
        }
        Remove-Item -LiteralPath $stateFile
    }
    Write-Host 'App processes stopped. Local PostgreSQL stays available.'
    exit 0
}

if (Test-Path -LiteralPath $stateFile) { throw 'A dev session is already recorded. Run ./scripts/dev.ps1 -Stop first.' }
if (-not $env:DATABASE_URL) {
    & (Join-Path $PSScriptRoot 'setup-local.ps1') -NoDownload
    $env:DATABASE_URL = 'postgres://stickywall@127.0.0.1:55432/stickywall?sslmode=disable'
}
$goCommand = Get-Command go.exe -ErrorAction SilentlyContinue
$go = if ($goCommand) { $goCommand.Source } else { Join-Path $localRoot 'tools/go/bin/go.exe' }
if (-not (Test-Path -LiteralPath $go)) { throw 'Install Go or run ./scripts/setup-local.ps1 first.' }
$node = (Get-Command node.exe -ErrorAction Stop).Source
$vite = Join-Path $projectRoot 'web/node_modules/vite/bin/vite.js'
if (-not (Test-Path -LiteralPath $vite)) {
    Push-Location (Join-Path $projectRoot 'web')
    try { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } } finally { Pop-Location }
}
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
Push-Location (Join-Path $projectRoot 'server')
try {
    & $go build -o (Join-Path $localRoot 'stickywall.exe') .
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
} finally { Pop-Location }
$env:STATIC_DIR = Join-Path $projectRoot 'web/dist'
$env:PORT = '8080'
$env:BIND_HOST = '127.0.0.1'
$backend = Start-Process -FilePath (Join-Path $localRoot 'stickywall.exe') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localRoot 'backend.log') -RedirectStandardError (Join-Path $localRoot 'backend-error.log')
try {
    $frontend = Start-Process -FilePath $node -ArgumentList @(('"' + $vite + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory (Join-Path $projectRoot 'web') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localRoot 'frontend.log') -RedirectStandardError (Join-Path $localRoot 'frontend-error.log')
} catch { Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue; throw }
@{ backend = $backend.Id; frontend = $frontend.Id } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
Write-Host 'App: http://127.0.0.1:5173'
Write-Host 'API: http://127.0.0.1:8080/api/health'
Write-Host 'Stop app: ./scripts/dev.ps1 -Stop'
