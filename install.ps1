$ErrorActionPreference = "Stop"

$repo = "quanthumtech/qai-cli"
$installDir = "$env:USERPROFILE\.qai\bin"

# Get latest release
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
$tag = $release.tag_name
$url = "https://github.com/$repo/releases/download/$tag/qai-windows-x64.exe"

Write-Host "Installing qai $tag..."

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Invoke-WebRequest -Uri $url -OutFile "$installDir\qai.exe"

# Add to PATH if not already there
$path = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($path -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$path;$installDir", "User")
    Write-Host "  Added $installDir to PATH (restart terminal to apply)"
}

Write-Host "✓ qai installed to $installDir\qai.exe"
Write-Host "  Run: qai"
