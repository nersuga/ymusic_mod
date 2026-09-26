# Builds dist\YandexMusicMods-Setup-<version>.exe from modloader\ and mods\ of this repository.
#   .\build.ps1 -Version 1.0.0
#   .\build.ps1 -Version 1.0.0 -CertThumbprint <thumbprint>     sign with a cert from Cert:\CurrentUser\My
#   .\build.ps1 -Version 1.0.0 -PfxPath cert.pfx                sign with a .pfx (asks for its password)
param(
  [string]$Version = "1.0.0",
  [string]$CertThumbprint = "",
  [string]$PfxPath = "",
  [string]$TimestampServer = "http://timestamp.digicert.com"
)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Src = Join-Path $Root "installer"
$Obj = Join-Path $Root "obj"
$Dist = Join-Path $Root "dist"
$Utf8Bom = New-Object Text.UTF8Encoding($true)
$Utf8 = New-Object Text.UTF8Encoding($false)

$ModloaderFiles = @("main.js", "preload.js", "features.js", "settings-ui.js", "mini-preload.js", "miniplayer.html",
  "patcher.js", "watch-update.ps1", "repair.cmd", "thumbar.js", "discord.js", "lastfm.js", "storage.js")
$ModFiles = @("_hello.js", "theme.css", "profile-menu.css", "vibe-settings.css", "vibe-settings.js", "window-buttons.css")

Remove-Item $Obj -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force (Join-Path $Obj "payload\modloader"), (Join-Path $Obj "payload\mods"), $Dist | Out-Null

# 1. Payload: the mod files (never config.json, backups or logs)
foreach ($f in $ModloaderFiles) { Copy-Item (Join-Path $Root "modloader\$f") (Join-Path $Obj "payload\modloader\$f") }
foreach ($f in $ModFiles) { Copy-Item (Join-Path $Root "mods\$f") (Join-Path $Obj "payload\mods\$f") }
foreach ($f in Get-ChildItem (Join-Path $Obj "payload\modloader") -Filter *.js) {
  & node --check $f.FullName
  if ($LASTEXITCODE) { throw "syntax error in $($f.Name)" }
}
Compress-Archive -Path (Join-Path $Obj "payload\*") -DestinationPath (Join-Path $Obj "payload.zip") -Force

# 2. installer.ps1 with the version; PowerShell 5.1 needs a BOM to read it as UTF-8
$installer = [IO.File]::ReadAllText((Join-Path $Src "installer.ps1"), $Utf8).Replace("__MOD_VERSION__", $Version)
[IO.File]::WriteAllText((Join-Path $Obj "installer.ps1"), $installer, $Utf8Bom)
$parseErrors = $null
[void][Management.Automation.Language.Parser]::ParseFile((Join-Path $Obj "installer.ps1"), [ref]$null, [ref]$parseErrors)
if ($parseErrors.Count) { throw "installer.ps1: $($parseErrors[0])" }

# 3. Icon: yellow rounded square with a black note (16..256 px, PNG entries)
Add-Type -AssemblyName System.Drawing
function New-IconPng([int]$Size) {
  $bmp = New-Object Drawing.Bitmap($Size, $Size)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $r = [single]($Size * 0.22)
  $s = [single]($Size - 1)
  $path = New-Object Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
  $path.AddArc($s - $r * 2, 0, $r * 2, $r * 2, 270, 90)
  $path.AddArc($s - $r * 2, $s - $r * 2, $r * 2, $r * 2, 0, 90)
  $path.AddArc(0, $s - $r * 2, $r * 2, $r * 2, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 219, 77))), $path)
  $k = $Size / 100.0
  $black = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(20, 20, 20))
  $g.FillEllipse($black, [single](24 * $k), [single](58 * $k), [single](24 * $k), [single](19 * $k))
  $g.FillEllipse($black, [single](56 * $k), [single](50 * $k), [single](24 * $k), [single](19 * $k))
  $g.FillRectangle($black, [single](43 * $k), [single](26 * $k), [single](6 * $k), [single](42 * $k))
  $g.FillRectangle($black, [single](75 * $k), [single](18 * $k), [single](6 * $k), [single](42 * $k))
  $beam = New-Object Drawing.Drawing2D.GraphicsPath
  $beam.AddPolygon([Drawing.PointF[]]@(
    (New-Object Drawing.PointF([single](43 * $k), [single](26 * $k))), (New-Object Drawing.PointF([single](81 * $k), [single](18 * $k))),
    (New-Object Drawing.PointF([single](81 * $k), [single](29 * $k))), (New-Object Drawing.PointF([single](43 * $k), [single](37 * $k)))))
  $g.FillPath($black, $beam)
  $g.Dispose()
  $ms = New-Object IO.MemoryStream
  $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return ,$ms.ToArray()
}
$sizes = @(16, 24, 32, 48, 64, 256)
$pngs = @($sizes | ForEach-Object { ,(New-IconPng $_) })
$ico = New-Object IO.MemoryStream
$w = New-Object IO.BinaryWriter($ico)
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $dim = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
  $w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$pngs[$i].Length); $w.Write([uint32]$offset)
  $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $w.Write([byte[]]$p) }
$w.Flush()
[IO.File]::WriteAllBytes((Join-Path $Obj "setup.ico"), $ico.ToArray())

# 4. Compile Setup.exe with the C# compiler that ships with Windows (.NET Framework 4)
$parts = ($Version -split "[^0-9]+" | Where-Object { $_ } | Select-Object -First 4)
while ($parts.Count -lt 4) { $parts += "0" }
$cs = [IO.File]::ReadAllText((Join-Path $Src "Setup.cs"), $Utf8).Replace("__VERSION4__", ($parts -join ".")).Replace("__VERSION__", $Version)
[IO.File]::WriteAllText((Join-Path $Obj "Setup.cs"), $cs, $Utf8Bom)
$exe = Join-Path $Dist "YandexMusicMods-Setup-$Version.exe"
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /nologo /target:winexe /optimize+ /codepage:65001 "/out:$exe" "/win32icon:$Obj\setup.ico" "/win32manifest:$Src\app.manifest" `
  "/resource:$Obj\installer.ps1,installer.ps1" "/resource:$Obj\payload.zip,payload.zip" `
  /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "$Obj\Setup.cs"
if ($LASTEXITCODE) { throw "csc failed" }

# 5. Optional Authenticode signature (SHA256 + RFC 3161 timestamp, so it stays valid after the cert expires)
$cert = $null
if ($CertThumbprint) { $cert = Get-Item "Cert:\CurrentUser\My\$CertThumbprint" }
elseif ($PfxPath) { $cert = Get-PfxCertificate -FilePath $PfxPath }
if ($cert) {
  $sig = Set-AuthenticodeSignature -FilePath $exe -Certificate $cert -HashAlgorithm SHA256 -TimestampServer $TimestampServer
  Write-Host "signature: $($sig.Status) $($sig.StatusMessage)"
  if ($sig.Status -eq "HashMismatch" -or $sig.Status -eq "NotSigned") { throw "signing failed" }
}

$hash = (Get-FileHash $exe -Algorithm SHA256).Hash
Set-Content -Path "$exe.sha256" -Value "$hash  $(Split-Path $exe -Leaf)" -Encoding ASCII
Write-Host ("built {0} ({1:N0} KB) sha256 {2}" -f $exe, ((Get-Item $exe).Length / 1KB), $hash)
