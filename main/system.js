const { runPSJson } = require('./ps');

const SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$cpu  = Get-CimInstance Win32_Processor | Select-Object -First 1

$gpus = @(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -and $_.Name -notmatch 'Basic|Remote|Idd|Mirror|DisplayLink' })
$discrete = $gpus | Where-Object { $_.Name -match 'NVIDIA|GeForce|RTX|GTX|Quadro|Radeon RX|Radeon Pro|Radeon Vega \\d|Arc(?! Pro)?|Intel\\(R\\) Arc' } | Select-Object -First 1
$integrated = $gpus | Where-Object { $_.Name -match 'UHD|Iris|HD Graphics|Radeon Graphics|Vega \\d Graphics' } | Select-Object -First 1
$gpu = $null
if ($discrete) { $gpu = $discrete }
elseif ($integrated) { $gpu = $integrated }
elseif ($gpus.Count -gt 0) { $gpu = $gpus[0] }

$mb   = Get-CimInstance Win32_BaseBoard | Select-Object -First 1
$bios = Get-CimInstance Win32_BIOS | Select-Object -First 1
$cs   = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1
$rams = @(Get-CimInstance Win32_PhysicalMemory)
$arr  = Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1
$disks = @(Get-CimInstance Win32_DiskDrive | Sort-Object Size -Descending)
$disk = if ($disks.Count -gt 0) { $disks[0] } else { $null }
$physDisks = @()
try { $physDisks = @(Get-PhysicalDisk -EA SilentlyContinue | Select-Object DeviceId, MediaType, FriendlyName, Size) } catch {}
$vols = @()
try {
  $vols = @(Get-Volume -EA SilentlyContinue | Where-Object { $_.DriveLetter -and $_.Size } | ForEach-Object {
    @{ letter = "$($_.DriveLetter)"; sizeGb = [math]::Round($_.Size / 1GB, 0); freeGb = [math]::Round($_.SizeRemaining / 1GB, 0); fs = "$($_.FileSystem)"; label = "$($_.FileSystemLabel)" }
  })
} catch {}
$os   = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1

$uptime = ''
if ($os.LastBootUpTime) {
  $u = (Get-Date) - $os.LastBootUpTime
  $uptime = ('{0}d {1}h {2}m' -f $u.Days, $u.Hours, $u.Minutes)
}

$totalRamGB = 0
if ($cs.TotalPhysicalMemory) { $totalRamGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 0) }

$ramUsedStr = ''
if ($os -and $os.TotalVisibleMemorySize -and $os.FreePhysicalMemory) {
  $usedKB = $os.TotalVisibleMemorySize - $os.FreePhysicalMemory
  $usedGB = [math]::Round($usedKB / 1MB, 1)
  $ramUsedStr = ('{0} GB' -f $usedGB)
}

$ramSpeed = 0
if ($rams -and $rams[0]) {
  if ($rams[0].ConfiguredClockSpeed) { $ramSpeed = $rams[0].ConfiguredClockSpeed }
  elseif ($rams[0].Speed) { $ramSpeed = $rams[0].Speed }
}
$ramType = ''
if ($rams -and $rams[0]) {
  switch ($rams[0].SMBIOSMemoryType) {
    20 { $ramType = 'DDR' }
    21 { $ramType = 'DDR2' }
    24 { $ramType = 'DDR3' }
    26 { $ramType = 'DDR4' }
    34 { $ramType = 'DDR5' }
    default { $ramType = '' }
  }
}
$ramMaker = ''
$ramPN = ''
if ($rams -and $rams[0]) {
  if ($rams[0].Manufacturer) { $ramMaker = $rams[0].Manufacturer.Trim() }
  if ($rams[0].PartNumber)   { $ramPN    = $rams[0].PartNumber.Trim() }
}
$slotsUsed = ($rams | Measure-Object).Count
$slotsTotal = $slotsUsed
if ($arr -and $arr.MemoryDevices) { $slotsTotal = $arr.MemoryDevices }

$diskSizeStr = ''
if ($disk -and $disk.Size) {
  $gb = [math]::Round($disk.Size / 1GB, 0)
  if ($gb -ge 1000) { $diskSizeStr = ('{0:N2} TB' -f ($gb / 1024)) }
  else { $diskSizeStr = ('{0} GB' -f $gb) }
}

$gpuVramStr = ''
if ($gpu -and $gpu.AdapterRAM) {
  $vg = [math]::Round($gpu.AdapterRAM / 1GB, 0)
  if ($vg -gt 0) { $gpuVramStr = ('{0} GB' -f $vg) }
}

$gpuKind = ''
if ($gpu -and $discrete -and $gpu.Name -eq $discrete.Name) { $gpuKind = 'Discrete' }
elseif ($gpu -and $integrated -and $gpu.Name -eq $integrated.Name) { $gpuKind = 'Integrated' }

$biosDate = ''
if ($bios -and $bios.ReleaseDate) { $biosDate = $bios.ReleaseDate.ToString('yyyy-MM-dd') }

$cpuClockMax = ''
if ($cpu -and $cpu.MaxClockSpeed) { $cpuClockMax = ('{0:N2} GHz' -f ($cpu.MaxClockSpeed / 1000)) }

$cpuCache = ''
if ($cpu -and $cpu.L3CacheSize) { $cpuCache = ('{0} MB L3' -f [math]::Round($cpu.L3CacheSize / 1024, 0)) }

$mbName = ''
if ($mb) { $mbName = (('{0} {1}' -f $mb.Manufacturer, $mb.Product)).Trim() }

$biosStr = ''
if ($bios) { $biosStr = (('{0} ({1})' -f $bios.SMBIOSBIOSVersion, $biosDate)).Trim(' ', '(', ')') }

$ramName = (('{0} {1}' -f $ramMaker, $ramPN)).Trim()
if (-not $ramName) { $ramName = 'Not found' }

$ramSpeedStr = ''
if ($ramSpeed -gt 0) {
  if ($ramType) { $ramSpeedStr = ('{0}-{1}' -f $ramType, $ramSpeed) }
  else { $ramSpeedStr = ('{0} MHz' -f $ramSpeed) }
}

$out = [ordered]@{
  cpu = [ordered]@{
    name  = if ($cpu -and $cpu.Name) { $cpu.Name.Trim() } else { 'Not found' }
    cores = if ($cpu) { ('{0} Cores / {1} Threads' -f $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors) } else { '' }
    clock = $cpuClockMax
    cache = $cpuCache
  }
  gpu = [ordered]@{
    name   = if ($gpu -and $gpu.Name) { $gpu.Name.Trim() } else { 'Not found' }
    kind   = $gpuKind
    vram   = $gpuVramStr
    driver = if ($gpu -and $gpu.DriverVersion) { $gpu.DriverVersion } else { 'None' }
    date   = if ($gpu -and $gpu.DriverDate)   { $gpu.DriverDate.ToString('yyyy-MM-dd') } else { '' }
  }
  motherboard = [ordered]@{
    name    = if ($mbName) { $mbName } else { 'Not found' }
    chipset = ''
    bios    = $biosStr
    socket  = ''
  }
  ram = [ordered]@{
    name  = $ramName
    total = if ($totalRamGB -gt 0) { ('{0} GB' -f $totalRamGB) } else { '' }
    used  = $ramUsedStr
    speed = $ramSpeedStr
    slots = ('{0} / {1} used' -f $slotsUsed, $slotsTotal)
  }
  storage = [ordered]@{
    name       = if ($disk -and $disk.Model) { $disk.Model.Trim() } else { 'Not found' }
    total      = $diskSizeStr
    mediaType  = if ($physDisks.Count -gt 0 -and $physDisks[0].MediaType) { "$($physDisks[0].MediaType)" } else { 'Unknown' }
    volumes    = $vols
    used       = ''
    health     = ''
  }
  os = [ordered]@{
    name    = if ($os -and $os.Caption) { $os.Caption.Trim() } else { '' }
    version = if ($os) { ('{0} Build {1}' -f $os.Version, $os.BuildNumber) } else { '' }
    arch    = if ($os -and $os.OSArchitecture) { $os.OSArchitecture } else { '' }
    uptime  = $uptime
  }
}
$out | ConvertTo-Json -Depth 4 -Compress
`;

const LIVE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$os = Get-CimInstance Win32_OperatingSystem
$cpuMax = (Get-CimInstance Win32_Processor | Select-Object -First 1).MaxClockSpeed

$freqPct = 100
$cpuLoad = 0
try {
  $perf = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'" -ErrorAction Stop
  if ($perf) {
    if ($perf.ProcessorFrequency) { $freqMhz = $perf.ProcessorFrequency }
    elseif ($perf.PercentProcessorPerformance -and $cpuMax) { $freqMhz = [int]($cpuMax * ($perf.PercentProcessorPerformance / 100)) }
    else { $freqMhz = $cpuMax }
    $cpuLoad = [int]$perf.PercentProcessorUtility
  }
} catch { $freqMhz = $cpuMax }
if (-not $freqMhz) { $freqMhz = $cpuMax }

$clockStr = ('{0:N2} GHz' -f ($freqMhz / 1000))

$ramUsedStr = ''
$ramPct = 0
if ($os.TotalVisibleMemorySize -and $os.FreePhysicalMemory) {
  $usedKB = $os.TotalVisibleMemorySize - $os.FreePhysicalMemory
  $usedGB = [math]::Round($usedKB / 1MB, 1)
  $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
  $ramUsedStr = ('{0} / {1} GB' -f $usedGB, $totalGB)
  $ramPct = [int](($usedKB * 100.0) / $os.TotalVisibleMemorySize)
}

$uptime = ''
if ($os.LastBootUpTime) {
  $u = (Get-Date) - $os.LastBootUpTime
  $uptime = ('{0}d {1}h {2}m' -f $u.Days, $u.Hours, $u.Minutes)
}

$gpuLoad = 0
if ($env:COBALT_INCLUDE_GPU -eq '1') {
  try {
    $samples = (Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage' -SampleInterval 1 -MaxSamples 1 -EA Stop).CounterSamples
    if ($samples) { $gpuLoad = [int]([math]::Min(100, ($samples | Measure-Object -Property CookedValue -Sum).Sum)) }
  } catch {}
}

@{
  cpuClock = $clockStr
  cpuLoad  = $cpuLoad
  gpuLoad  = $gpuLoad
  ramUsed  = $ramUsedStr
  ramPct   = $ramPct
  uptime   = $uptime
} | ConvertTo-Json -Compress
`;

async function getSystemInfo() {
  return await runPSJson(SCRIPT, { timeoutMs: 30000 });
}

async function getSystemLive(opts = {}) {
  const env = opts.includeGpu ? 'COBALT_INCLUDE_GPU=1; ' : '';
  const wrapped = env
    ? `$env:COBALT_INCLUDE_GPU='1'; ${LIVE_SCRIPT}`
    : LIVE_SCRIPT;
  return await runPSJson(wrapped, { timeoutMs: 15000 });
}

module.exports = { getSystemInfo, getSystemLive };
