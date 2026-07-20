$ErrorActionPreference = 'SilentlyContinue'
$installDir = "$env:LOCALAPPDATA\Programs\Cobalt"
$startMenu = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$desktop = [Environment]::GetFolderPath('Desktop')

Write-Host "Uninstalling Cobalt..."
Get-Process -Name Cobalt | Stop-Process -Force
Start-Sleep -Milliseconds 500

Remove-Item -Path (Join-Path $startMenu 'Cobalt.lnk') -Force
Remove-Item -Path (Join-Path $desktop 'Cobalt.lnk') -Force

Remove-Item -Path 'HKCU:\Software\Classes\AppUserModelId\com.enes.cobalt' -Recurse -Force
Remove-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Cobalt' -Recurse -Force

$parent = Split-Path $installDir
Start-Job -ScriptBlock {
  param($dir)
  Start-Sleep -Seconds 2
  Remove-Item -Path $dir -Recurse -Force
} -ArgumentList $installDir | Out-Null

Write-Host "Cobalt uninstalled."
Start-Sleep -Seconds 2
