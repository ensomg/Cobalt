const { runPSJson, runPS } = require('./ps');

const SETTINGS = [
  {
    id: 'pua',
    title: 'Block Potentially Unwanted Apps (PUA)',
    desc: 'Blocks apps flagged as adware, bundleware, evasion.',
    category: 'core',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name PUAProtection -EA Stop).PUAProtection`,
    values: { off: 0, low: 2, high: 1 },
    default: 'high',
  },
  {
    id: 'cloud-block-level',
    title: 'Cloud Block Level',
    desc: 'How aggressively Defender uses cloud-delivered detection. High = block based on cloud reputation.',
    category: 'core',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\MpEngine' -Name MpCloudBlockLevel -EA Stop).MpCloudBlockLevel`,
    values: { default: 0, high: 2, highPlus: 4, zeroTolerance: 6 },
    default: 'high',
  },
  {
    id: 'cloud-timeout',
    title: 'Extended Cloud Check Timeout',
    desc: 'Wait up to N extra seconds for cloud verdict before allowing suspicious file.',
    category: 'core',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\MpEngine' -Name MpBafsExtendedTimeout -EA Stop).MpBafsExtendedTimeout`,
    values: { off: 0, medium: 20, high: 50 },
    default: 'medium',
  },
  {
    id: 'mapsreporting',
    title: 'Join MAPS (Cloud Protection)',
    desc: 'Send anonymous threat telemetry to Microsoft Active Protection Service.',
    category: 'cloud',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet' -Name SpynetReporting -EA Stop).SpynetReporting`,
    values: { off: 0, basic: 1, advanced: 2 },
    default: 'advanced',
  },
  {
    id: 'samplesubmission',
    title: 'Automatic Sample Submission',
    desc: 'Automatically send suspicious files to Microsoft for analysis.',
    category: 'cloud',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet' -Name SubmitSamplesConsent -EA Stop).SubmitSamplesConsent`,
    values: { never: 2, safe: 1, all: 3 },
    default: 'safe',
  },
  {
    id: 'realtime',
    title: 'Real-Time Protection',
    desc: 'Actively scans files as they are accessed.',
    category: 'core',
    check: `(-not (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Name DisableRealtimeMonitoring -EA Stop).DisableRealtimeMonitoring)`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection', name: 'DisableRealtimeMonitoring', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'behavior-monitor',
    title: 'Behavior Monitoring',
    desc: 'Detect malicious patterns in running processes.',
    category: 'core',
    check: `(-not (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Name DisableBehaviorMonitoring -EA Stop).DisableBehaviorMonitoring)`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection', name: 'DisableBehaviorMonitoring', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'network-inspection',
    title: 'Network Inspection System',
    desc: 'Inspect network traffic for exploits.',
    category: 'network',
    check: `(-not (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender NIS' -Name DisableIOAVProtection -EA Stop).DisableIOAVProtection)`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\NIS', name: 'DisableSignatureRetirement', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'block-atfirstseen',
    title: 'Block At First Sight',
    desc: 'Block never-before-seen files while cloud analyzes them.',
    category: 'cloud',
    check: `(-not (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet' -Name DisableBlockAtFirstSeen -EA Stop).DisableBlockAtFirstSeen)`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet', name: 'DisableBlockAtFirstSeen', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'scan-removable',
    title: 'Scan Removable Drives',
    desc: 'Scan USB drives during full/quick scan.',
    category: 'scan',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Scan' -Name DisableRemovableDriveScanning -EA Stop).DisableRemovableDriveScanning -eq 0`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Scan', name: 'DisableRemovableDriveScanning', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'scan-archives',
    title: 'Scan Archives (ZIP/RAR)',
    desc: 'Scan inside archive files.',
    category: 'scan',
    check: `(-not (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Scan' -Name DisableArchiveScanning -EA Stop).DisableArchiveScanning)`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Scan', name: 'DisableArchiveScanning', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'scan-scripts',
    title: 'Script Scanning',
    desc: 'Scan JavaScript, VBScript, PowerShell before execution.',
    category: 'scan',
    check: `(-not (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Name DisableScriptScanning -EA Stop).DisableScriptScanning)`,
    binaryToggle: { key: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection', name: 'DisableScriptScanning', on: 0, off: 1 },
    default: 'on',
  },
  {
    id: 'controlled-folder',
    title: 'Controlled Folder Access',
    desc: 'Anti-ransomware: only trusted apps can modify protected folders.',
    category: 'asr',
    check: `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\Controlled Folder Access' -Name EnableControlledFolderAccess -EA Stop).EnableControlledFolderAccess`,
    values: { off: 0, on: 1, audit: 2 },
    default: 'on',
  },
];

const ASR_RULES = [
  { id: 'D4F940AB-401B-4EFC-AADC-AD5F3C50688A', title: 'Block Office child processes' },
  { id: '5BEB7EFE-FD9A-4556-801D-275E5FFC04CC', title: 'Block execution of downloaded scripts (Windows JS/VBS)' },
  { id: 'BE9BA2D9-53EA-4CDC-84E5-9B1EEEE46550', title: 'Block executable content from email' },
  { id: 'D3E037E1-3EB8-44C8-A917-57927947596D', title: 'Block JS/VBS from launching downloaded content' },
  { id: 'B2B3F03D-6A65-4F7B-A9C7-1C7EF74A9BA4', title: 'Block untrusted USB executables' },
  { id: '3B576869-A4EC-4529-8536-B80A7769E899', title: 'Block Office from creating executables' },
  { id: 'D1E49AAC-8F56-4280-B9BA-993A6D77406C', title: 'Block child process creation from PSExec/WMI' },
  { id: 'E6DB77E5-3DF2-4CF1-B95A-636979351E5B', title: 'Block persistence via WMI subscription' },
  { id: '75668C1F-73B5-4CF0-BB93-3ECF5CB7CC84', title: 'Block Adobe Reader child processes' },
  { id: '26190899-1602-49E8-8B27-EB1D0A1CE869', title: 'Block Office communication child processes' },
  { id: '7674BA52-37EB-4A4F-A9A1-F0F9A1619A2C', title: 'Block Office macros from Win32 API calls' },
  { id: '01443614-CD74-433A-B99E-2ECDC07BFC25', title: 'Block untrusted executables' },
];

const PRESETS = {
  default: {
    'pua': 'low', 'cloud-block-level': 'default', 'cloud-timeout': 'medium',
    'mapsreporting': 'advanced', 'samplesubmission': 'safe', 'realtime': 'on',
    'behavior-monitor': 'on', 'network-inspection': 'on', 'block-atfirstseen': 'on',
    'scan-removable': 'on', 'scan-archives': 'on', 'scan-scripts': 'on', 'controlled-folder': 'off',
    asr: 'off',
  },
  high: {
    'pua': 'high', 'cloud-block-level': 'high', 'cloud-timeout': 'high',
    'mapsreporting': 'advanced', 'samplesubmission': 'safe', 'realtime': 'on',
    'behavior-monitor': 'on', 'network-inspection': 'on', 'block-atfirstseen': 'on',
    'scan-removable': 'on', 'scan-archives': 'on', 'scan-scripts': 'on', 'controlled-folder': 'on',
    asr: 'audit',
  },
  max: {
    'pua': 'high', 'cloud-block-level': 'zeroTolerance', 'cloud-timeout': 'high',
    'mapsreporting': 'advanced', 'samplesubmission': 'all', 'realtime': 'on',
    'behavior-monitor': 'on', 'network-inspection': 'on', 'block-atfirstseen': 'on',
    'scan-removable': 'on', 'scan-archives': 'on', 'scan-scripts': 'on', 'controlled-folder': 'on',
    asr: 'block',
  },
};

async function getStatus() {
  const assigns = SETTINGS.map((s, i) => `$v${i} = try { ${s.check} } catch { $null }`).join('; ');
  const inserts = SETTINGS.map((s, i) => `$r['${s.id}'] = $v${i}`).join('; ');
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
${assigns}
$r = [ordered]@{}
${inserts}
$r | ConvertTo-Json -Compress
`;
  const data = await runPSJson(script, { timeoutMs: 15000 });
  return data || {};
}

function applyLine(setting, value) {
  if (setting.binaryToggle) {
    const t = setting.binaryToggle;
    const v = t[value] != null ? t[value] : t.on;
    return `New-Item '${t.key}' -Force | Out-Null; Set-ItemProperty '${t.key}' '${t.name}' -Value ${v} -Type DWord`;
  }
  if (setting.values) {
    const parts = setting.check.match(/'([^']+)'\s+-Name\s+(\w+)/);
    if (!parts) return '';
    const key = parts[1];
    const name = parts[2];
    const v = setting.values[value] != null ? setting.values[value] : setting.values[setting.default];
    return `New-Item '${key}' -Force | Out-Null; Set-ItemProperty '${key}' '${name}' -Value ${v} -Type DWord`;
  }
  return '';
}

async function applySettings(idsWithValues) {
  const lines = [];
  for (const { id, value } of idsWithValues) {
    const s = SETTINGS.find((x) => x.id === id);
    if (!s) continue;
    const line = applyLine(s, value);
    if (line) lines.push(`try { ${line}; Write-Host 'OK::${id}' } catch { Write-Host ('FAIL::${id}::' + $_.Exception.Message) }`);
  }
  const out = await runPS(lines.join(';'), { timeoutMs: 30000 });
  const applied = [];
  const failed = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('OK::')) applied.push(line.slice(4));
    else if (line.startsWith('FAIL::')) {
      const [_, id, ...rest] = line.split('::');
      failed.push({ id, error: rest.join('::') });
    }
  }
  return { applied, failed };
}

async function applyPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) throw new Error('Unknown preset');
  const items = Object.entries(preset).filter(([k]) => k !== 'asr').map(([id, value]) => ({ id, value }));
  const settingResult = await applySettings(items);

  let asrApplied = 0;
  const asrMode = preset.asr;
  const asrVal = asrMode === 'block' ? 1 : asrMode === 'audit' ? 2 : 0;
  const asrLines = ASR_RULES.map((r) =>
    `Set-MpPreference -AttackSurfaceReductionRules_Ids '${r.id}' -AttackSurfaceReductionRules_Actions ${asrVal} -EA SilentlyContinue`
  ).join('; ');
  try { await runPS(asrLines, { timeoutMs: 30000 }); asrApplied = ASR_RULES.length; } catch {}

  return { ...settingResult, asrApplied, preset: presetName };
}

const DISABLE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$results = @()

$policyKeys = @(
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender'; name='DisableAntiSpyware'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender'; name='DisableAntiVirus';    value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender'; name='DisableRoutinelyTakingAction'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender'; name='ServiceKeepAlive';    value=0 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection'; name='DisableRealtimeMonitoring'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection'; name='DisableBehaviorMonitoring'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection'; name='DisableOnAccessProtection'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection'; name='DisableScanOnRealtimeEnable'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection'; name='DisableIOAVProtection'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection'; name='DisableScriptScanning'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet'; name='SpynetReporting'; value=0 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet'; name='SubmitSamplesConsent'; value=2 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet'; name='DisableBlockAtFirstSeen'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Reporting'; name='DisableEnhancedNotifications'; value=1 },
  @{ path='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Reporting'; name='DisableGenericRePorts'; value=1 }
)
foreach ($k in $policyKeys) {
  try {
    if (-not (Test-Path $k.path)) { New-Item -Path $k.path -Force | Out-Null }
    Set-ItemProperty -Path $k.path -Name $k.name -Value $k.value -Type DWord -EA Stop
    $results += @{ ok=$true; kind='policy'; key="$($k.path)::$($k.name)" }
  } catch { $results += @{ ok=$false; kind='policy'; key="$($k.path)::$($k.name)"; error=$_.Exception.Message } }
}

try {
  Set-MpPreference -DisableRealtimeMonitoring $true -EA Stop
  Set-MpPreference -DisableBehaviorMonitoring $true -EA Stop
  Set-MpPreference -DisableBlockAtFirstSeen $true -EA Stop
  Set-MpPreference -DisableIOAVProtection $true -EA Stop
  Set-MpPreference -DisableScriptScanning $true -EA Stop
  Set-MpPreference -MAPSReporting 0 -EA Stop
  Set-MpPreference -SubmitSamplesConsent 2 -EA Stop
  $results += @{ ok=$true; kind='mp-preference'; key='all' }
} catch { $results += @{ ok=$false; kind='mp-preference'; error=$_.Exception.Message } }

$services = @('WinDefend','WdNisSvc','Sense','SecurityHealthService','WdFilter','MDCoreSvc')
foreach ($svc in $services) {
  try {
    $s = Get-Service -Name $svc -EA Stop
    if ($s) {
      $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$svc"
      if (Test-Path $regPath) {
        Set-ItemProperty -Path $regPath -Name 'Start' -Value 4 -Type DWord -EA SilentlyContinue
      }
      $results += @{ ok=$true; kind='service'; key=$svc }
    }
  } catch { $results += @{ ok=$false; kind='service'; key=$svc; error=$_.Exception.Message } }
}

try {
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Scheduled Scan" /Disable | Out-Null
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Cache Maintenance" /Disable | Out-Null
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Cleanup" /Disable | Out-Null
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Verification" /Disable | Out-Null
  $results += @{ ok=$true; kind='schtasks'; key='defender-tasks' }
} catch { $results += @{ ok=$false; kind='schtasks'; error=$_.Exception.Message } }

$results | ConvertTo-Json -Compress -Depth 4
`;

const ENABLE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$results = @()

$policyKeys = @('DisableAntiSpyware','DisableAntiVirus','DisableRoutinelyTakingAction','ServiceKeepAlive')
foreach ($n in $policyKeys) { try { Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name $n -EA Stop; $results += @{ ok=$true; kind='policy'; key=$n } } catch { $results += @{ ok=$false; kind='policy'; key=$n; error=$_.Exception.Message } } }

$rt = @('DisableRealtimeMonitoring','DisableBehaviorMonitoring','DisableOnAccessProtection','DisableScanOnRealtimeEnable','DisableIOAVProtection','DisableScriptScanning')
foreach ($n in $rt) { try { Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Name $n -EA Stop; $results += @{ ok=$true; kind='rt'; key=$n } } catch { $results += @{ ok=$false; kind='rt'; key=$n; error=$_.Exception.Message } } }

try {
  Set-MpPreference -DisableRealtimeMonitoring $false -EA Stop
  Set-MpPreference -DisableBehaviorMonitoring $false -EA Stop
  Set-MpPreference -DisableBlockAtFirstSeen $false -EA Stop
  Set-MpPreference -DisableIOAVProtection $false -EA Stop
  Set-MpPreference -DisableScriptScanning $false -EA Stop
  Set-MpPreference -MAPSReporting 2 -EA Stop
  Set-MpPreference -SubmitSamplesConsent 1 -EA Stop
  $results += @{ ok=$true; kind='mp-preference'; key='all' }
} catch { $results += @{ ok=$false; kind='mp-preference'; error=$_.Exception.Message } }

$services = @{ 'WinDefend'=2; 'WdNisSvc'=3; 'Sense'=3; 'SecurityHealthService'=3; 'WdFilter'=0; 'MDCoreSvc'=3 }
foreach ($svc in $services.GetEnumerator()) {
  try {
    $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\$($svc.Key)"
    if (Test-Path $regPath) { Set-ItemProperty -Path $regPath -Name 'Start' -Value $svc.Value -Type DWord -EA SilentlyContinue }
    $results += @{ ok=$true; kind='service'; key=$svc.Key }
  } catch { $results += @{ ok=$false; kind='service'; key=$svc.Key; error=$_.Exception.Message } }
}

try {
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Scheduled Scan" /Enable | Out-Null
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Cache Maintenance" /Enable | Out-Null
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Cleanup" /Enable | Out-Null
  schtasks /Change /TN "\\Microsoft\\Windows\\Windows Defender\\Windows Defender Verification" /Enable | Out-Null
  $results += @{ ok=$true; kind='schtasks'; key='defender-tasks' }
} catch { $results += @{ ok=$false; kind='schtasks'; error=$_.Exception.Message } }

$results | ConvertTo-Json -Compress -Depth 4
`;

async function disableCompletely() {
  const raw = await runPSJson(DISABLE_SCRIPT, { timeoutMs: 60000 });
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const ok = arr.filter((x) => x.ok).length;
  const failed = arr.filter((x) => !x.ok);
  return { ok, failed, total: arr.length };
}

async function enableCompletely() {
  const raw = await runPSJson(ENABLE_SCRIPT, { timeoutMs: 60000 });
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const ok = arr.filter((x) => x.ok).length;
  const failed = arr.filter((x) => !x.ok);
  return { ok, failed, total: arr.length };
}

async function isDisabled() {
  const script = `
$rp = try { (Get-MpPreference).DisableRealtimeMonitoring } catch { $null }
$as = try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name DisableAntiSpyware -EA Stop).DisableAntiSpyware } catch { $null }
@{ realtimeDisabled = $rp; policyDisabled = ($as -eq 1) } | ConvertTo-Json -Compress
`;
  return await runPSJson(script, { timeoutMs: 15000 });
}

module.exports = { SETTINGS, PRESETS, ASR_RULES, getStatus, applySettings, applyPreset, disableCompletely, enableCompletely, isDisabled };
