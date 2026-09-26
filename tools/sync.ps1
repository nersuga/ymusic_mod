# Development helper: syncs the mod files between this repository and the installed mod.
#   .\tools\sync.ps1 pull   - %APPDATA%\YandexMusic -> repository (after editing the live files)
#   .\tools\sync.ps1 push   - repository -> %APPDATA%\YandexMusic (CSS/JS mods reload live; main.js needs an app restart)
# config.json, backups and logs are never copied.
param([Parameter(Mandatory = $true)][ValidateSet("pull", "push")][string]$Direction)
$ErrorActionPreference = "Stop"
$Repo = Split-Path $PSScriptRoot -Parent
$Live = Join-Path $env:APPDATA "YandexMusic"
$sets = @{
  "modloader" = @("main.js", "preload.js", "features.js", "settings-ui.js", "mini-preload.js", "miniplayer.html", "patcher.js", "watch-update.ps1", "repair.cmd", "thumbar.js", "discord.js", "lastfm.js", "storage.js", "updater.js")
  "mods"      = @(Get-ChildItem (Join-Path $Repo "mods") -File | ForEach-Object { $_.Name })
}
foreach ($dir in $sets.Keys) {
  foreach ($name in $sets[$dir]) {
    $repoFile = Join-Path $Repo "$dir\$name"
    $liveFile = Join-Path $Live "$dir\$name"
    # A mod disabled in the app is renamed to _name: sync with that copy
    if ($dir -eq "mods" -and -not (Test-Path $liveFile)) {
      $alt = Join-Path $Live ("mods\" + $(if ($name.StartsWith("_")) { $name.Substring(1) } else { "_" + $name }))
      if (Test-Path $alt) { $liveFile = $alt }
    }
    if ($Direction -eq "pull") { if (Test-Path $liveFile) { Copy-Item $liveFile $repoFile -Force } }
    else { New-Item -ItemType Directory -Force (Split-Path $liveFile) | Out-Null; Copy-Item $repoFile $liveFile -Force }
    Write-Host "$Direction $dir\$name"
  }
}
