const { runPSJson } = require('./ps');

const SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  $session = New-Object -ComObject Microsoft.Update.Session
  $searcher = $session.CreateUpdateSearcher()

  $muRegistered = $false
  try {
    $sm = New-Object -ComObject Microsoft.Update.ServiceManager
    $svc = $sm.Services | Where-Object { $_.ServiceID -eq '7971f918-a847-4430-9279-4a52d1efe18d' }
    if ($svc) {
      $muRegistered = $true
    } else {
      $sm.AddService2('7971f918-a847-4430-9279-4a52d1efe18d', 7, '') | Out-Null
      $muRegistered = $true
    }
  } catch { $muRegistered = $false }

  if ($muRegistered) {
    $searcher.ServerSelection = 3
    $searcher.ServiceID = '7971f918-a847-4430-9279-4a52d1efe18d'
  }
  $searchResult = $searcher.Search("IsInstalled=0 and Type='Driver' and IsHidden=0")

  $out = @()
  foreach ($u in $searchResult.Updates) {
    $item = [ordered]@{
      updateId    = $u.Identity.UpdateID
      title       = $u.Title
      description = $u.Description
      kb          = if ($u.KBArticleIDs -and $u.KBArticleIDs.Count -gt 0) { $u.KBArticleIDs.Item(0) } else { '' }
      severity    = $u.MsrcSeverity
      sizeMb      = if ($u.MaxDownloadSize) { [math]::Round($u.MaxDownloadSize / 1MB, 1) } else { 0 }
      driverClass = ''
      driverVersion = ''
      driverModel = ''
      driverMfg = ''
      driverDate = ''
      hardwareIds = @()
    }
    try {
      if ($u.DriverClass)    { $item.driverClass   = $u.DriverClass }
      if ($u.DriverModel)    { $item.driverModel   = $u.DriverModel }
      if ($u.DriverProvider) { $item.driverMfg     = $u.DriverProvider }
      elseif ($u.DriverManufacturer) { $item.driverMfg = $u.DriverManufacturer }
      if ($u.DriverHardwareID) { $item.hardwareIds = @($u.DriverHardwareID) }
      if ($u.DriverVerDate) { $item.driverDate = $u.DriverVerDate.ToString('yyyy-MM-dd') }
    } catch {}
    $verMatch = [regex]::Match($u.Title, '(\\d+\\.\\d+(?:\\.\\d+){0,3})\\s*$')
    if ($verMatch.Success) { $item.driverVersion = $verMatch.Groups[1].Value }
    $out += (New-Object PSObject -Property $item)
  }

  @{
    ok = $true
    count = $out.Count
    updates = $out
  } | ConvertTo-Json -Depth 5 -Compress
} catch {
  @{
    ok = $false
    error = $_.Exception.Message
  } | ConvertTo-Json -Compress
}
`;

async function checkDriverUpdates() {
  const raw = await runPSJson(SCRIPT, { timeoutMs: 180000 });
  if (!raw) return { updates: [] };
  if (raw.ok === false) throw new Error(raw.error || 'Windows Update search failed');
  return { updates: raw.updates || [] };
}

module.exports = { checkDriverUpdates };
