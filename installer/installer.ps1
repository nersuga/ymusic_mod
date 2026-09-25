# Логика установщика модов для Яндекс Музыки. Окно рисует Setup.exe, он же вызывает этот скрипт:
#   installer.ps1 -Action status                  - JSON с состоянием (приложение, версия, стоит ли мод)
#   installer.ps1 -Action install [-SetupExe p]   - установка/обновление, прогресс построчно в stdout
#   installer.ps1 -Action uninstall [-RemoveSettings]
# Код выхода 0 - успех. Рядом должен лежать payload.zip (modloader\ и mods\), для удаления он не нужен.
param(
  [ValidateSet("status", "install", "uninstall")][string]$Action = "install",
  [string]$AppDir = "",
  [string]$SetupExe = "",
  [switch]$Silent,
  [switch]$NoLaunch,
  [switch]$RemoveSettings
)
$ErrorActionPreference = "Stop"
$ModVersion = "__MOD_VERSION__"
$Here = $PSScriptRoot
$DataDir = Join-Path $env:APPDATA "YandexMusic"
$ModHome = Join-Path $DataDir "modloader"
$ModsDir = Join-Path $DataDir "mods"
$UninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\YandexMusicMods"

$ru = ([Globalization.CultureInfo]::CurrentUICulture.TwoLetterISOLanguageName -in @("ru", "kk", "uz", "be", "uk"))
function T([string]$Ru, [string]$En) { if ($ru) { $Ru } else { $En } }

# ── Поиск приложения ──────────────────────────────────────────────────────
function Find-AppDir {
  $candidates = @()
  if ($AppDir) { $candidates += $AppDir }
  $candidates += (Join-Path $env:LOCALAPPDATA "Programs\YandexMusic")
  foreach ($root in @("HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall", "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall")) {
    try {
      Get-ChildItem $root -ErrorAction Stop | ForEach-Object {
        $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
        if ($p.InstallLocation -and ($p.PSChildName -match "YandexMusic|yandex-music|ru\.yandex\.desktop\.music" -or "$($p.Publisher)" -match "Yandex|Яндекс")) {
          $candidates += $p.InstallLocation
        }
      }
    } catch {}
  }
  foreach ($dir in $candidates) {
    if ($dir -and (Test-Path (Join-Path $dir "resources\app.asar"))) { return (Resolve-Path $dir).Path }
  }
  return $null
}
function Get-AppExe([string]$Dir) {
  Get-ChildItem -Path $Dir -Filter *.exe | Where-Object { $_.Name -notmatch "^(Uninstall|elevate)" } |
    Sort-Object Length -Descending | Select-Object -First 1
}
# Заголовок asar: по нему видно, стоит ли мод (package.json main = ymmods-boot.js)
function Test-Patched([string]$Dir) {
  try {
    $fs = [IO.File]::Open((Join-Path $Dir "resources\app.asar"), "Open", "Read", "ReadWrite")
    try {
      $head = New-Object byte[] 16
      [void]$fs.Read($head, 0, 16)
      $len = [BitConverter]::ToUInt32($head, 12)
      $buf = New-Object byte[] $len
      [void]$fs.Read($buf, 0, $len)
      return ([Text.Encoding]::UTF8.GetString($buf)).Contains('"ymmods-boot.js"')
    } finally { $fs.Close() }
  } catch { return $false }
}
function Get-InstalledModVersion {
  $f = Join-Path $ModHome "version.txt"
  if (Test-Path $f) { (Get-Content $f -Raw).Trim() } else { "" }
}

# ── Шаги ──────────────────────────────────────────────────────────────────
# Копирует файлы мода. Моды из mods\ обновляются, но если пользователь отключил мод
# (переименовал в _имя), обновляется отключённая копия. config.json не трогается.
function Copy-Payload {
  $zip = Join-Path $Here "payload.zip"
  if (-not (Test-Path $zip)) { throw (T "Рядом с установщиком нет payload.zip" "payload.zip is missing next to the installer") }
  $tmp = Join-Path $env:TEMP ("ymmods-payload-" + [Guid]::NewGuid().ToString("N"))
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  try {
    New-Item -ItemType Directory -Force $ModHome, $ModsDir | Out-Null
    Copy-Item -Path (Join-Path $tmp "modloader\*") -Destination $ModHome -Recurse -Force
    foreach ($f in Get-ChildItem (Join-Path $tmp "mods") -File) {
      $name = $f.Name.TrimStart("_")
      $disabled = Join-Path $ModsDir ("_" + $name)
      $enabled = Join-Path $ModsDir $name
      if (Test-Path $disabled) { Copy-Item $f.FullName $disabled -Force }
      elseif (Test-Path $enabled) { Copy-Item $f.FullName $enabled -Force }
      else { Copy-Item $f.FullName (Join-Path $ModsDir $f.Name) -Force }
    }
    # Копия установщика нужна для удаления через «Установленные приложения»
    if ($SetupExe -and (Test-Path $SetupExe)) { Copy-Item $SetupExe (Join-Path $ModHome "Setup.exe") -Force }
    Remove-Item (Join-Path $ModHome "installer.ps1") -ErrorAction SilentlyContinue
    Set-Content -Path (Join-Path $ModHome "version.txt") -Value $ModVersion -Encoding ASCII
  } finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
function Register-Uninstall([string]$Dir) {
  $exe = Get-AppExe $Dir
  New-Item -Path $UninstallKey -Force | Out-Null
  $cmd = "`"$ModHome\Setup.exe`""
  Set-ItemProperty $UninstallKey -Name DisplayName -Value (T "Моды для Яндекс Музыки" "Yandex Music Mods")
  Set-ItemProperty $UninstallKey -Name DisplayVersion -Value $ModVersion
  Set-ItemProperty $UninstallKey -Name Publisher -Value "ymmods"
  Set-ItemProperty $UninstallKey -Name InstallLocation -Value $ModHome
  Set-ItemProperty $UninstallKey -Name UninstallString -Value $cmd
  if ($exe) { Set-ItemProperty $UninstallKey -Name DisplayIcon -Value $exe.FullName }
  Set-ItemProperty $UninstallKey -Name NoModify -Value 1 -Type DWord
  Set-ItemProperty $UninstallKey -Name NoRepair -Value 1 -Type DWord
}
# Запускает watch-update.ps1 (закрывает приложение, патчит/восстанавливает asar и хэш в exe)
function Start-Watcher([string]$Mode, [string]$Dir, [bool]$Launch) {
  $script = Join-Path $ModHome "watch-update.ps1"
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Mode $Mode -AppDir `"$Dir`""
  if ($Mode -eq "repair") { $argList += " -Force" }
  if (-not $Launch) { $argList += " -NoLaunch" }
  Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden -PassThru
}
function Get-LogLength { $f = Join-Path $ModHome "watch.log"; if (Test-Path $f) { (Get-Item $f).Length } else { 0 } }
function Read-LogFrom([long]$Offset) {
  $f = Join-Path $ModHome "watch.log"
  if (-not (Test-Path $f)) { return @() }
  $fs = [IO.File]::Open($f, "Open", "Read", "ReadWrite")
  try {
    if ($fs.Length -le $Offset) { return @() }
    [void]$fs.Seek($Offset, "Begin")
    $text = (New-Object IO.StreamReader($fs, [Text.Encoding]::UTF8)).ReadToEnd()
    return @($text -split "`r?`n" | Where-Object { $_ })
  } finally { $fs.Close() }
}
# Понятное описание строки журнала watch-update.ps1
function Describe([string]$Line) {
  $msg = $Line -replace "^\[[^\]]+\] \[[^\]]+\] ", ""
  switch -Regex ($msg) {
    "^closing Yandex Music" { return (T "Закрываю Яндекс Музыку…" "Closing Yandex Music…") }
    "^patcher: patched, version (\S+), wheel patched: (\w+)" {
      $wheel = if ($Matches[2] -eq "True") { T "колесо «Моей волны» пропатчено" "My Vibe wheel patched" } else { T "колесо «Моей волны» оставлено как есть" "My Vibe wheel left native" }
      return ((T "Собрал модифицированный app.asar для версии {0} ({1})" "Built the modified app.asar for {0} ({1})") -f $Matches[1], $wheel)
    }
    "^patcher: restored" { return (T "Подготовил оригинальный app.asar" "Prepared the original app.asar") }
    "^patcher: not-patched" { return (T "Приложение и так без мода" "The app is not modded") }
    "^mod installed into version (\S+)" { return ((T "Мод установлен в версию {0}" "Mod installed into {0}") -f $Matches[1]) }
    "^original app restored" { return (T "Оригинальное приложение восстановлено" "Original app restored") }
    "^starting Yandex Music" { return (T "Запускаю Яндекс Музыку" "Starting Yandex Music") }
    "^rolling back" { return ((T "Откат: {0}" "Rolling back: {0}") -f ($msg -replace "^rolling back: ", "")) }
    "^ERROR: (.*)" {
      $err = $Matches[1]
      if ($err -match "locked") { return (T "Ошибка: файл app.asar занят другой программой (часто VS Code или другое Electron-приложение с открытой папкой Яндекс Музыки). Закройте её и повторите." "Error: app.asar is locked by another program (often VS Code). Close it and retry.") }
      return ((T "Ошибка: {0}" "Error: {0}") -f $err)
    }
    default { return $msg }
  }
}

# Вся установка/удаление целиком. $OnLine получает строки для журнала, $OnDone - код результата
function Invoke-Setup([string]$What, [string]$Dir, [bool]$Launch, [bool]$DropSettings, [scriptblock]$OnLine) {
  if ($What -eq "install") {
    & $OnLine (T "Копирую файлы мода в $ModHome" "Copying mod files to $ModHome")
    Copy-Payload
    Register-Uninstall $Dir
    & $OnLine (T "Патчу приложение (Яндекс Музыка будет перезапущена)…" "Patching the app (Yandex Music will restart)…")
    return (Start-Watcher "repair" $Dir $Launch)
  }
  if (-not (Test-Path (Join-Path $ModHome "watch-update.ps1"))) {
    # Мода нет, но на всякий случай подчищаем запись в реестре
    Remove-Item $UninstallKey -Recurse -Force -ErrorAction SilentlyContinue
    & $OnLine (T "Мод не установлен" "The mod is not installed")
    return $null
  }
  & $OnLine (T "Возвращаю оригинальное приложение (Яндекс Музыка будет закрыта)…" "Restoring the original app (Yandex Music will close)…")
  return (Start-Watcher "uninstall" $Dir $false)
}
# После удаления: стираем файлы мода, только если оригинал успешно восстановлен
function Complete-Uninstall([bool]$Ok, [string]$Dir, [bool]$Launch, [bool]$DropSettings, [scriptblock]$OnLine) {
  if ($Ok) {
    # Каталог, из которого запущен скрипт, удалять можно: он уже прочитан
    Remove-Item $ModHome -Recurse -Force -ErrorAction SilentlyContinue
    if ($DropSettings) { Remove-Item $ModsDir -Recurse -Force -ErrorAction SilentlyContinue }
    Remove-Item $UninstallKey -Recurse -Force -ErrorAction SilentlyContinue
    if ($DropSettings) { & $OnLine (T "Файлы и настройки мода удалены" "Mod files and settings removed") }
    else { & $OnLine (T "Файлы мода удалены (настройки в папке mods сохранены)" "Mod files removed (settings in the mods folder kept)") }
  }
  if ($Launch) {
    $exe = Get-AppExe $Dir
    if ($exe) { Start-Process -FilePath $exe.FullName -WorkingDirectory $Dir; & $OnLine (T "Запускаю Яндекс Музыку" "Starting Yandex Music") }
  }
}

# ── Запуск ────────────────────────────────────────────────────────────────
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
function Say([string]$Text) { [Console]::Out.WriteLine($Text); [Console]::Out.Flush() }
$dir = Find-AppDir

if ($Action -eq "status") {
  $state = [ordered]@{ found = [bool]$dir; dir = "$dir"; appVersion = ""; patched = $false; modFiles = $false; modVersion = Get-InstalledModVersion; bundledVersion = $ModVersion; lang = $(if ($ru) { "ru" } else { "en" }) }
  if ($dir) {
    $exe = Get-AppExe $dir
    if ($exe) { $state.appVersion = $exe.VersionInfo.ProductVersion }
    $state.patched = Test-Patched $dir
    $state.modFiles = Test-Path (Join-Path $ModHome "main.js")
  }
  Say ($state | ConvertTo-Json -Compress)
  exit 0
}

if (-not $dir) { Say (T "Ошибка: Яндекс Музыка не найдена" "Error: Yandex Music not found"); exit 1 }
$say = { param($t) Say $t }
try {
  $offset = Get-LogLength
  $proc = Invoke-Setup $Action $dir (-not $NoLaunch) ([bool]$RemoveSettings) $say
  if (-not $proc) { exit 0 }
  # Журнал watch-update.ps1 пересказываем по мере появления строк
  while (-not $proc.HasExited) {
    Start-Sleep -Milliseconds 300
    foreach ($l in @(Read-LogFrom $offset)) { Say (Describe $l) }
    $offset = Get-LogLength
  }
  foreach ($l in @(Read-LogFrom $offset)) { Say (Describe $l) }
  $ok = $proc.ExitCode -eq 0
  if ($Action -eq "uninstall") { Complete-Uninstall $ok $dir (-not $NoLaunch) ([bool]$RemoveSettings) $say }
  if ($ok) { exit 0 } else { exit 1 }
} catch { Say ((T "Ошибка: {0}" "Error: {0}") -f $_); exit 1 }
