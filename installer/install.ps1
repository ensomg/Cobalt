$ErrorActionPreference = 'Stop'
$installDir = "$env:LOCALAPPDATA\Programs\Cobalt"
$startMenu = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$desktop = [Environment]::GetFolderPath('Desktop')
$aumid = 'com.enes.cobalt'

Write-Host "Installing Cobalt to: $installDir"

if (Test-Path $installDir) {
  Write-Host "Removing previous installation..."
  Get-Process -Name Cobalt -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -Recurse -Force $installDir
}
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

Write-Host "Extracting files..."
$payloadZip = Join-Path $PSScriptRoot 'payload.zip'
if (-not (Test-Path $payloadZip)) {
  throw "payload.zip not found at $payloadZip"
}
Expand-Archive -Path $payloadZip -DestinationPath $installDir -Force

$exePath = Join-Path $installDir 'Cobalt.exe'
$iconPath = Join-Path $installDir 'cobaltbg.png'

function New-CobaltShortcut($linkPath) {
  $WshShell = New-Object -ComObject WScript.Shell
  $sc = $WshShell.CreateShortcut($linkPath)
  $sc.TargetPath = $exePath
  $sc.IconLocation = "$exePath,0"
  $sc.WorkingDirectory = $installDir
  $sc.Description = 'Modern PC maintenance & driver management'
  $sc.Save()
}

Write-Host "Creating shortcuts..."
New-CobaltShortcut (Join-Path $startMenu 'Cobalt.lnk')
New-CobaltShortcut (Join-Path $desktop 'Cobalt.lnk')

$linkPath = Join-Path $startMenu 'Cobalt.lnk'
try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class PS {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  public static extern void SHGetPropertyStoreFromParsingName([In, MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr zeroWorks, int flags, ref Guid riid, [Out, MarshalAs(UnmanagedType.Interface)] out IPropertyStore ppv);
  [DllImport("propsys.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  public static extern void PSGetPropertyKeyFromName([In, MarshalAs(UnmanagedType.LPWStr)] string pszName, out PropertyKey pkey);
  [StructLayout(LayoutKind.Sequential, Pack = 4)] public struct PropertyKey { public Guid fmtid; public uint pid; }
  public struct PropVariant { public ushort vt; public ushort r1; public ushort r2; public ushort r3; public IntPtr ptr; public IntPtr ptr2; }
}
[ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPropertyStore { int GetCount(out uint props); int GetAt(uint prop, out PS.PropertyKey pkey); int GetValue(ref PS.PropertyKey key, out PS.PropVariant pv); int SetValue(ref PS.PropertyKey key, ref PS.PropVariant pv); int Commit(); }
'@
  $guid = New-Object Guid('886d8eeb-8cf2-4446-8d02-cdba1dbdcf99')
  $store = $null
  [PS]::SHGetPropertyStoreFromParsingName($linkPath, [IntPtr]::Zero, 3, [ref]$guid, [ref]$store)
  $key = New-Object PS+PropertyKey
  [PS]::PSGetPropertyKeyFromName('System.AppUserModel.ID', [ref]$key)
  $pv = New-Object PS+PropVariant
  $pv.vt = 31
  $strPtr = [System.Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($aumid)
  $pv.ptr = $strPtr
  [void]$store.SetValue([ref]$key, [ref]$pv)
  [void]$store.Commit()
  [System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($strPtr)
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($store) | Out-Null
} catch { Write-Host "AUMID assignment failed: $_" }

$regPath = "HKCU:\Software\Classes\AppUserModelId\$aumid"
if (-not (Test-Path $regPath)) { New-Item $regPath -Force | Out-Null }
Set-ItemProperty $regPath 'DisplayName' 'Cobalt'
Set-ItemProperty $regPath 'IconUri' $iconPath
Set-ItemProperty $regPath 'IconBackgroundColor' 'FF1a1d24'

Write-Host "Registering uninstaller..."
$uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Cobalt"
if (-not (Test-Path $uninstallKey)) { New-Item $uninstallKey -Force | Out-Null }
Set-ItemProperty $uninstallKey 'DisplayName' 'Cobalt'
Set-ItemProperty $uninstallKey 'DisplayVersion' '0.1.0'
Set-ItemProperty $uninstallKey 'Publisher' 'Enes'
Set-ItemProperty $uninstallKey 'InstallLocation' $installDir
Set-ItemProperty $uninstallKey 'DisplayIcon' $exePath
Set-ItemProperty $uninstallKey 'UninstallString' "powershell -NoProfile -ExecutionPolicy Bypass -File `"$installDir\uninstall.ps1`""
Set-ItemProperty $uninstallKey 'NoModify' 1 -Type DWord
Set-ItemProperty $uninstallKey 'NoRepair' 1 -Type DWord
$size = ((Get-ChildItem $installDir -Recurse | Measure-Object -Sum Length).Sum / 1024)
Set-ItemProperty $uninstallKey 'EstimatedSize' ([int]$size) -Type DWord

Copy-Item -Path "$PSScriptRoot\uninstall.ps1" -Destination $installDir -Force

Write-Host ""
Write-Host "Installation complete!"
Write-Host "  Install dir : $installDir"
Write-Host "  Start Menu  : Cobalt"
Write-Host "  Desktop     : Cobalt"
Write-Host ""
Write-Host "Launching Cobalt..."
Start-Process $exePath
