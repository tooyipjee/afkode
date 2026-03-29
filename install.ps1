$ErrorActionPreference = 'Stop'

$repo = "tooyipjee/afkode"
$appName = "AFKode"

Write-Host ""
Write-Host "  $appName Installer" -ForegroundColor Cyan
Write-Host "  ---------------------"
Write-Host ""

Write-Host "  -> Fetching latest release..." -ForegroundColor Gray

try {
    $release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
} catch {
    Write-Host "  x Failed to fetch release info: $_" -ForegroundColor Red
    exit 1
}

$asset = $release.assets | Where-Object { $_.name -like "*win-x64.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Host "  x Could not find Windows installer in latest release" -ForegroundColor Red
    exit 1
}

$version = $release.tag_name
$url = $asset.browser_download_url
$filename = $asset.name
$tmpDir = Join-Path $env:TEMP "afkode-install"
$installer = Join-Path $tmpDir $filename

if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

Write-Host "  -> Downloading $appName $version..." -ForegroundColor Gray

try {
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
} catch {
    Write-Host "  x Download failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "  -> Installing..." -ForegroundColor Gray
Start-Process -FilePath $installer -ArgumentList '/S' -Wait

Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  ✓ $appName $version installed!" -ForegroundColor Green
Write-Host ""
