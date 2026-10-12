# Creates Desktop + Start-menu shortcuts for Bullpen (dev server, no console window).
# Run from PowerShell:  powershell -ExecutionPolicy Bypass -File C:\projects\Bullpen\make-bullpen-shortcuts.ps1
# Then: Start menu -> type "Bullpen" -> right-click -> Pin to taskbar.

$root   = "C:\projects\Bullpen"
$vbs    = Join-Path $root "start-bullpen-hidden.vbs"
$icon   = Join-Path $root "bullpen.ico"
$target = "$env:SystemRoot\System32\wscript.exe"

foreach ($p in @($vbs, $icon)) {
    if (-not (Test-Path $p)) { Write-Error "Missing: $p"; exit 1 }
}

$desktop   = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"

$shell = New-Object -ComObject WScript.Shell
foreach ($dir in @($desktop, $startMenu)) {
    $lnkPath = Join-Path $dir "Bullpen.lnk"
    $lnk = $shell.CreateShortcut($lnkPath)
    $lnk.TargetPath       = $target
    $lnk.Arguments        = "`"$vbs`""
    $lnk.WorkingDirectory = Join-Path $root "react-app"
    $lnk.IconLocation     = "$icon,0"
    $lnk.Description      = "Bullpen - start dev server and open in browser"
    $lnk.WindowStyle      = 7   # minimized
    $lnk.Save()
    Write-Host "Created $lnkPath"
}

Write-Host ""
Write-Host "Done. To pin to the taskbar: open Start, type Bullpen, right-click it, choose 'Pin to taskbar'."
