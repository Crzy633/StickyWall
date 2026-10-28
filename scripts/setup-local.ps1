param([switch]$NoDownload)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.local/tools'
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null

function Get-LocalTool([string]$Name, [string]$RelativePath) {
    $installed = Get-Command $Name -ErrorAction SilentlyContinue
    if ($installed) { return $installed.Source }
    $local = Join-Path $toolsRoot $RelativePath
    if (Test-Path -LiteralPath $local) { return $local }
    return $null
}

$go = Get-LocalTool 'go.exe' 'go/bin/go.exe'
if (-not $go) {
    if ($NoDownload) { throw 'Go is unavailable. Run scripts/setup-local.ps1 without -NoDownload.' }
    $goZip = Join-Path $toolsRoot 'go.zip'
    Write-Host 'Downloading official portable Go 1.27.3...'
    & curl.exe --fail --location --silent --show-error 'https://go.dev/dl/go1.27.3.windows-amd64.zip' --output $goZip
    if ($LASTEXITCODE -ne 0) { throw 'Go download failed.' }
    $actual = (Get-FileHash -LiteralPath $goZip -Algorithm SHA256).Hash
    if ($actual -ne 'f26081f438319757f8a1b46d7d0b2c5ec7583d4038e485e0aa725cfde7885fff') { throw 'Go checksum mismatch.' }
    Expand-Archive -LiteralPath $goZip -DestinationPath $toolsRoot -Force
    $go = Get-LocalTool 'go.exe' 'go/bin/go.exe'
}

$pgCtl = Get-LocalTool 'pg_ctl.exe' 'pgsql/bin/pg_ctl.exe'
if (-not $pgCtl) {
    if ($NoDownload) { throw 'PostgreSQL is unavailable. Run scripts/setup-local.ps1 without -NoDownload.' }
    $postgresZip = Join-Path $toolsRoot 'postgres.zip'
    Write-Host 'Downloading PostgreSQL 17.11 portable binaries from EnterpriseDB...'
    & curl.exe --fail --location --silent --show-error 'https://sbp.enterprisedb.com/getfile.jsp?fileid=1260616' --output $postgresZip
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL download failed.' }
    Expand-Archive -LiteralPath $postgresZip -DestinationPath $toolsRoot -Force
    $pgCtl = Get-LocalTool 'pg_ctl.exe' 'pgsql/bin/pg_ctl.exe'
}

$pgBin = Split-Path -Parent $pgCtl
$pgData = Join-Path $projectRoot '.local/data/postgres'
if (-not (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
    # Development-only cluster; trust is restricted to loopback by pg_ctl below.
    & (Join-Path $pgBin 'initdb.exe') -D $pgData -U stickywall --encoding=UTF8 --locale=C --auth-local=trust --auth-host=trust
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
}
& $pgCtl -D $pgData status *> $null
if ($LASTEXITCODE -ne 0) {
    $port = Get-NetTCPConnection -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue
    if ($port) { throw 'Port 55432 is occupied. Stop the conflicting process or use your own DATABASE_URL.' }
    & $pgCtl -D $pgData -l (Join-Path $projectRoot '.local/postgres.log') -o '-h 127.0.0.1 -p 55432' -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed.' }
}
$exists = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U stickywall -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='stickywall'"
if ($LASTEXITCODE -ne 0) { throw 'Cannot query local PostgreSQL.' }
if ($exists -ne '1') {
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U stickywall stickywall
    if ($LASTEXITCODE -ne 0) { throw 'Database creation failed.' }
}
Write-Host "Go: $go"
Write-Host 'PostgreSQL: 127.0.0.1:55432, database stickywall (loopback-only development instance)'
Write-Host 'Ready. Run ./scripts/dev.ps1 to start the app.'
