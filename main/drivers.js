const { runPSJson } = require('./ps');

const SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$targets = @('display','net','media','system','hdc','usb','bluetooth','monitor','printer','scsiadapter','camera','image','biometric','smartcardreader','sound','keyboard','mouse','1394','ports','processor','battery','sensor')

$drvMap = @{}
Get-CimInstance Win32_PnPSignedDriver | ForEach-Object {
  if ($_.DeviceID) {
    $drvMap[$_.DeviceID.ToLower()] = @{
      version = $_.DriverVersion
      date    = if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') } else { $null }
      vendor  = $_.Manufacturer
    }
  }
}

$out = @()
foreach ($d in Get-PnpDevice) {
  if (-not $d.Class) { continue }
  $cls = $d.Class.ToLower()
  if (-not ($targets -contains $cls)) { continue }
  if ($d.Status -eq 'Unknown') { continue }
  $key = $d.InstanceId.ToLower()
  $drv = $drvMap[$key]
  $version = $null
  $date = $null
  $vendor = $d.Manufacturer
  if ($drv) {
    $version = $drv.version
    $date = $drv.date
    if (-not $vendor) { $vendor = $drv.vendor }
  }
  $out += [ordered]@{
    name    = $d.FriendlyName
    vendor  = $vendor
    class   = $d.Class
    status  = $d.Status
    version = $version
    date    = $date
  }
}
$out | ConvertTo-Json -Depth 3 -Compress
`;

async function scanDrivers() {
  const raw = await runPSJson(SCRIPT, { timeoutMs: 60000 });
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .filter((d) => d && d.name)
    .map((d) => ({
      id: `${d.class}::${d.name}`.toLowerCase().replace(/\s+/g, '-'),
      name: d.name,
      vendor: d.vendor || 'Unknown',
      klass: d.class,
      status: d.status || 'Unknown',
      version: d.version || null,
      date: d.date || null,
    }));
}

module.exports = { scanDrivers };
