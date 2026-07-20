const { runPSStream } = require('./ps');

function buildScript(updateIds) {
  const idsPS = updateIds.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(',');
  return `
$ErrorActionPreference = 'Stop'
$targetIds = @(${idsPS})

function Emit($tag, $obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 5
  Write-Host ("::" + $tag + "::" + $json)
}

$isAdmin = ([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Emit 'ERROR' @{ code = 'not-admin'; message = 'Requires administrator privileges. Please restart Cobalt as administrator.' }
  exit 1
}

try {
  Emit 'PHASE' @{ phase = 'search' }
  $session = New-Object -ComObject Microsoft.Update.Session
  $searcher = $session.CreateUpdateSearcher()

  try {
    $sm = New-Object -ComObject Microsoft.Update.ServiceManager
    $svc = $sm.Services | Where-Object { $_.ServiceID -eq '7971f918-a847-4430-9279-4a52d1efe18d' }
    if (-not $svc) { $sm.AddService2('7971f918-a847-4430-9279-4a52d1efe18d', 7, '') | Out-Null }
    $searcher.ServerSelection = 3
    $searcher.ServiceID = '7971f918-a847-4430-9279-4a52d1efe18d'
  } catch {}

  $searchResult = $searcher.Search("IsInstalled=0 and Type='Driver' and IsHidden=0")

  $collection = New-Object -ComObject Microsoft.Update.UpdateColl
  foreach ($u in $searchResult.Updates) {
    if ($targetIds -contains $u.Identity.UpdateID) {
      if (-not $u.EulaAccepted) { try { $u.AcceptEula() } catch {} }
      [void]$collection.Add($u)
    }
  }

  if ($collection.Count -eq 0) {
    Emit 'ERROR' @{ code = 'not-found'; message = 'No matching updates found. The list may be stale; please re-check.' }
    exit 1
  }

  Emit 'PHASE' @{ phase = 'download'; total = $collection.Count }

  $downloader = $session.CreateUpdateDownloader()
  $downloader.Updates = $collection
  $downloadJob = $downloader.BeginDownload($null, $null, $null)
} catch {
  Emit 'ERROR' @{ code = 'async-failed'; message = $_.Exception.Message }
  exit 1
}

try {
  while (-not $downloadJob.IsCompleted) {
    Start-Sleep -Milliseconds 500
    try {
      $p = $downloadJob.GetProgress()
      Emit 'PROGRESS' @{ phase = 'download'; percent = [int]$p.PercentComplete; current = [int]$p.CurrentUpdateIndex; total = $collection.Count; currentPercent = [int]$p.CurrentUpdatePercentComplete }
    } catch {}
  }
  $downloadResult = $downloader.EndDownload($downloadJob)
  Emit 'PROGRESS' @{ phase = 'download'; percent = 100 }
  Emit 'PHASE' @{ phase = 'download-complete'; result = [int]$downloadResult.ResultCode }
} catch {
  Emit 'ERROR' @{ code = 'download-failed'; message = $_.Exception.Message }
  exit 1
}

$installable = New-Object -ComObject Microsoft.Update.UpdateColl
for ($i = 0; $i -lt $collection.Count; $i++) {
  $u = $collection.Item($i)
  if ($u.IsDownloaded) { [void]$installable.Add($u) }
}

if ($installable.Count -eq 0) {
  Emit 'ERROR' @{ code = 'nothing-downloaded'; message = 'No updates were successfully downloaded.' }
  exit 1
}

Emit 'PHASE' @{ phase = 'install'; total = $installable.Count }

try {
  $installer = $session.CreateUpdateInstaller()
  $installer.Updates = $installable
  $installJob = $installer.BeginInstall($null, $null, $null)
  while (-not $installJob.IsCompleted) {
    Start-Sleep -Milliseconds 700
    try {
      $p = $installJob.GetProgress()
      Emit 'PROGRESS' @{ phase = 'install'; percent = [int]$p.PercentComplete; current = [int]$p.CurrentUpdateIndex; total = $installable.Count; currentPercent = [int]$p.CurrentUpdatePercentComplete }
    } catch {}
  }
  $installResult = $installer.EndInstall($installJob)
  Emit 'PROGRESS' @{ phase = 'install'; percent = 100 }

  $perUpdate = @()
  for ($i = 0; $i -lt $installable.Count; $i++) {
    $u = $installable.Item($i)
    $r = $installResult.GetUpdateResult($i)
    $perUpdate += [ordered]@{
      updateId       = $u.Identity.UpdateID
      title          = $u.Title
      resultCode     = [int]$r.ResultCode
      hresult        = [int]$r.HResult
      rebootRequired = [bool]$r.RebootRequired
    }
  }

  Emit 'DONE' @{
    resultCode     = [int]$installResult.ResultCode
    rebootRequired = [bool]$installResult.RebootRequired
    updates        = $perUpdate
  }
} catch {
  Emit 'ERROR' @{ code = 'install-failed'; message = $_.Exception.Message }
  exit 1
}
`;
}

async function installUpdates(updateIds, onEvent) {
  if (!Array.isArray(updateIds) || updateIds.length === 0) throw new Error('No updates to install');
  const script = buildScript(updateIds);
  let final = null;
  let error = null;

  try {
    await runPSStream(script, {
      timeoutMs: 30 * 60 * 1000,
      onLine: (line) => {
        const m = /^::(PHASE|PROGRESS|DONE|ERROR)::(.*)$/.exec(line);
        if (!m) return;
        const tag = m[1];
        let payload;
        try { payload = JSON.parse(m[2]); } catch { return; }
        if (tag === 'DONE') final = payload;
        else if (tag === 'ERROR') error = payload;
        if (onEvent) onEvent({ type: tag.toLowerCase(), payload });
      },
    });
  } catch (e) {
    if (!error) throw e;
  }

  if (error) {
    const e = new Error(error.message);
    e.code = error.code;
    throw e;
  }
  if (!final) throw new Error('Install finished without a DONE event');
  return final;
}

module.exports = { installUpdates };
