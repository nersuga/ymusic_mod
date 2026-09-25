# Yandex Music mod: re-applies the mod after an app update (or on demand).
#   -Mode update : started by the mod when the app quits to install an update; waits for the installer
#   -Mode repair : patch right now (closes the app first); used by repair.cmd and the installer
#   -Mode uninstall : put the original app.asar back (closes the app first); used by the installer
# Steps: run patcher.js with the app's own exe as Node -> swap app.asar -> write the new asar integrity
# hash into the exe -> start the app. Any failure rolls back to the previous app.asar.
param(
  [ValidateSet("update", "repair", "uninstall")][string]$Mode = "repair",
  [string]$AppDir = (Join-Path $env:LOCALAPPDATA "Programs\YandexMusic"),
  [int]$WaitPid = 0,
  [switch]$NoLaunch,
  [switch]$Force
)
$ErrorActionPreference = "Stop"
$ExitCode = 0
$ModHome = $PSScriptRoot
$LogFile = Join-Path $ModHome "watch.log"
function Log([string]$Message) {
  $line = "[{0:yyyy-MM-dd HH:mm:ss}] [{1}] {2}" -f (Get-Date), $Mode, $Message
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

$Asar = Join-Path $AppDir "resources\app.asar"
$Exe = Get-ChildItem -Path $AppDir -Filter *.exe | Where-Object { $_.Name -notmatch "^(Uninstall|elevate)" } |
  Sort-Object Length -Descending | Select-Object -First 1
if (-not $Exe -or -not (Test-Path $Asar)) { Log "Yandex Music not found in $AppDir"; exit 1 }
function Get-AppProcesses { Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith($AppDir, [StringComparison]::OrdinalIgnoreCase) } }
function Wait-AppExit([int]$Seconds = 30) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline -and @(Get-AppProcesses).Count) { Start-Sleep -Milliseconds 500 }
}
# Files stay locked for a moment after processes exit: retry IO instead of failing
function Invoke-WithRetry([scriptblock]$Action, [int]$Tries = 60) {
  for ($i = 1; ; $i++) {
    try { return & $Action } catch { if ($i -ge $Tries) { throw }; Start-Sleep -Milliseconds 500 }
  }
}
function Get-InstallerProcesses {
  $updaterDir = Join-Path $env:LOCALAPPDATA "yandexmusic-updater"
  Get-Process | Where-Object { ($_.Path -and $_.Path.StartsWith($updaterDir, [StringComparison]::OrdinalIgnoreCase)) -or $_.Name -like "Un_*" -or $_.Name -like "Yandex_Music*" }
}

try {
  if ($WaitPid -gt 0) {
    Log "waiting for app process $WaitPid to exit"
    try { Wait-Process -Id $WaitPid -Timeout 120 -ErrorAction Stop } catch {}
  }

  if ($Mode -eq "update") {
    # The installer replaces app.asar; wait until it has finished and the files are quiet
    $before = (Get-Item $Asar).LastWriteTimeUtc
    $deadline = (Get-Date).AddMinutes(15)
    $sawInstaller = $false
    $stableSince = $null
    while ((Get-Date) -lt $deadline) {
      Start-Sleep -Seconds 2
      $installer = @(Get-InstallerProcesses)
      if ($installer.Count) { $sawInstaller = $true; $stableSince = $null; continue }
      if (-not (Test-Path $Asar)) { $stableSince = $null; continue }
      $changed = (Get-Item $Asar).LastWriteTimeUtc -ne $before
      if (-not $changed -and -not $sawInstaller -and (Get-Date) -lt $deadline.AddMinutes(-12)) { continue }
      if (-not $stableSince) { $stableSince = Get-Date }
      if (((Get-Date) - $stableSince).TotalSeconds -ge 5) { break }
    }
    Log ("installer finished (asar changed: {0})" -f ((Get-Item $Asar).LastWriteTimeUtc -ne $before))
  }
  # Repair: the app is running. Update: the installer may have started the new, still unpatched version.
  # Either way it locks the exe, so close it; it is started again (patched) at the end
  $running = @(Get-AppProcesses)
  if ($running.Count) {
    Log "closing Yandex Music"
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
  }
  Wait-AppExit

  # Run the patcher with the app's own runtime (fuse RunAsNode); fall back to a system Node
  $resultFile = Join-Path $env:TEMP "ymmods-patch.json"
  Remove-Item $resultFile -ErrorAction SilentlyContinue
  $patcher = Join-Path $ModHome "patcher.js"
  $patchArgs = "`"$patcher`" --app-dir `"$AppDir`" --out `"$resultFile`""
  if ($Force) { $patchArgs += " --force" }
  if ($Mode -eq "uninstall") { $patchArgs += " --restore" }
  $env:ELECTRON_RUN_AS_NODE = "1"
  try { Start-Process -FilePath $Exe.FullName -ArgumentList $patchArgs -Wait -WindowStyle Hidden } finally { Remove-Item Env:ELECTRON_RUN_AS_NODE }
  if (-not (Test-Path $resultFile) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    Log "app runtime did not produce a result, using system node"
    Start-Process -FilePath "node" -ArgumentList $patchArgs -Wait -WindowStyle Hidden
  }
  if (-not (Test-Path $resultFile)) { throw "patcher produced no result" }
  $result = Get-Content $resultFile -Raw | ConvertFrom-Json
  Log ("patcher: {0}, version {1}, wheel patched: {2} {3}" -f $result.status, $result.version, $result.wheelPatched, ($result.notes -join "; "))
  if (-not $result.ok) { throw "patcher failed" }

  if ($result.status -in @("patched", "restored")) {
    Wait-AppExit
    $prev = "$Asar.ymmods-prev"
    Remove-Item $prev -ErrorAction SilentlyContinue
    try { Invoke-WithRetry { Move-Item $Asar $prev -ErrorAction Stop } 240 }
    catch { throw "app.asar is locked by another program (often VS Code or another Electron app with the Yandex Music folder open). Close it and run repair.cmd" }
    try {
      Invoke-WithRetry { Move-Item $result.newAsar $Asar -ErrorAction Stop }
      if ($result.offset -ge 0) {
        # Write the new integrity hash; the exe may stay locked for a moment after the patcher exits
        $written = $false
        for ($i = 0; $i -lt 30 -and -not $written; $i++) {
          try {
            $fs = [IO.File]::Open($Exe.FullName, "Open", "ReadWrite", "None")
            try {
              $current = New-Object byte[] 64
              [void]$fs.Seek([int64]$result.offset, "Begin")
              [void]$fs.Read($current, 0, 64)
              if ([Text.Encoding]::ASCII.GetString($current) -ne $result.oldHash) { throw "unexpected bytes at hash offset" }
              $new = [Text.Encoding]::ASCII.GetBytes($result.newHash)
              [void]$fs.Seek([int64]$result.offset, "Begin")
              $fs.Write($new, 0, $new.Length)
              $written = $true
            } finally { $fs.Close() }
          } catch [IO.IOException] { Start-Sleep -Milliseconds 500 }
        }
        if (-not $written) { throw "exe stayed locked, hash not written" }
      }
      Remove-Item $prev -ErrorAction SilentlyContinue
      if ($result.status -eq "restored") { Log "original app restored, version $($result.version)" }
      else { Log "mod installed into version $($result.version)" }
    } catch {
      Log "rolling back: $_"
      Invoke-WithRetry { if (Test-Path $Asar) { Remove-Item $Asar -ErrorAction Stop }; Move-Item $prev $Asar -ErrorAction Stop }
      throw
    }
  }
} catch {
  Log "ERROR: $_"
  $ExitCode = 1
} finally {
  if (-not $NoLaunch) {
    Log "starting Yandex Music"
    Start-Process -FilePath $Exe.FullName -WorkingDirectory $AppDir
  }
}
exit $ExitCode
