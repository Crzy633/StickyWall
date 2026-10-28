param([string]$DatabaseUrl = 'postgres://stickywall@127.0.0.1:55432/stickywall?sslmode=disable')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$installed = Get-Command psql.exe -ErrorAction SilentlyContinue
$psql = if ($installed) { $installed.Source } else { Join-Path $projectRoot '.local/tools/pgsql/bin/psql.exe' }
if (-not (Test-Path -LiteralPath $psql)) { throw 'psql is unavailable. Run ./scripts/setup-local.ps1 first.' }
$uri = [Uri]$DatabaseUrl
if ($uri.Scheme -notin @('postgres', 'postgresql') -or -not $uri.Host) { throw 'DatabaseUrl must be a PostgreSQL connection URL.' }
$identity = $uri.UserInfo.Split(':', 2)
$query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
foreach ($key in $query.AllKeys) { if ($key -ne 'sslmode') { throw "Unsupported connection URL option: $key" } }
$settings = @{
    PGHOST = $uri.Host
    PGPORT = if ($uri.Port -gt 0) { [string]$uri.Port } else { '5432' }
    PGUSER = [Uri]::UnescapeDataString($identity[0])
    PGPASSWORD = if ($identity.Length -eq 2) { [Uri]::UnescapeDataString($identity[1]) } else { $null }
    PGDATABASE = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
    PGSSLMODE = if ($query['sslmode']) { $query['sslmode'] } else { 'prefer' }
    PGCLIENTENCODING = 'UTF8'
}
$previous = @{}
try {
    # Keep connection credentials out of command-line arguments.
    foreach ($key in $settings.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key)
        [Environment]::SetEnvironmentVariable($key, $settings[$key])
    }
    & $psql -X -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'demo.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Demo import failed.' }
} finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key]) }
}
