const { app } = require('electron');
const { spawn } = require('child_process');
const { runPSJson, runPS } = require('./ps');
const fs = require('fs');
const path = require('path');

const LIST_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$roots = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
)
$out = @()
foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem $root -EA SilentlyContinue | ForEach-Object {
    $key = $_
    $p = Get-ItemProperty $key.PSPath -EA SilentlyContinue
    if (-not $p) { return }
    if (-not $p.DisplayName) { return }
    if ($p.SystemComponent -eq 1) { return }
    if ($p.WindowsInstaller -eq 1 -and $p.ParentKeyName) { return }
    $iconPath = ''
    if ($p.DisplayIcon) {
      $iconPath = ($p.DisplayIcon -split ',')[0].Trim('"')
    }
    $installDate = ''
    if ($p.InstallDate -and $p.InstallDate.Length -eq 8) {
      $installDate = $p.InstallDate.Substring(0,4) + '-' + $p.InstallDate.Substring(4,2) + '-' + $p.InstallDate.Substring(6,2)
    }
    $sizeMb = 0
    if ($p.EstimatedSize) { $sizeMb = [int]($p.EstimatedSize / 1024) }
    $out += [ordered]@{
      keyId          = $key.Name
      keyName        = $key.PSChildName
      hive           = ($root -split ':')[0]
      name           = $p.DisplayName
      version        = $p.DisplayVersion
      publisher      = $p.Publisher
      installLocation= $p.InstallLocation
      installSource  = $p.InstallSource
      installDate    = $installDate
      sizeMb         = $sizeMb
      uninstallString= $p.UninstallString
      quietUninstall = $p.QuietUninstallString
      modifyPath     = $p.ModifyPath
      iconPath       = $iconPath
      urlInfo        = $p.URLInfoAbout
      helpLink       = $p.HelpLink
    }
  }
}
$out | ConvertTo-Json -Compress -Depth 4
`;

async function listInstalledPrograms() {
  const data = await runPSJson(LIST_SCRIPT, { timeoutMs: 30000 });
  if (!data) return [];
  const arr = Array.isArray(data) ? data : [data];
  const seen = new Set();
  return arr
    .filter((p) => {
      if (!p || !p.name) return false;
      const k = (p.name + '|' + (p.version || '')).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

async function getIconDataUrl(iconPath) {
  if (!iconPath) return null;
  try {
    const img = await app.getFileIcon(iconPath, { size: 'normal' });
    if (img.isEmpty()) return null;
    return img.toDataURL();
  } catch {
    return null;
  }
}

async function getRegistryDetails(keyId) {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$key = '${keyId.replace(/'/g, "''")}'
$k = Get-Item "Registry::$key" -EA SilentlyContinue
if (-not $k) { '{}' | Out-String; return }
$props = @{}
foreach ($name in $k.GetValueNames()) {
  $val = $k.GetValue($name)
  if ($null -ne $val) {
    $s = "$val"
    if ($s.Length -gt 400) { $s = $s.Substring(0, 400) + '...' }
    $props[$name] = $s
  }
}
@{ path = $key; values = $props } | ConvertTo-Json -Compress -Depth 4
`;
  return await runPSJson(script, { timeoutMs: 8000 });
}

function runUninstall(cmd, onEvent, timeoutMs = 15 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    if (!cmd) return reject(new Error('No uninstall command available'));
    const proc = spawn('cmd.exe', ['/c', cmd], { windowsHide: true });
    let buf = '';
    let stdoutAll = '';
    const to = setTimeout(() => { proc.kill(); reject(new Error('Uninstall timed out')); }, timeoutMs);
    const handle = (chunk) => {
      const s = chunk.toString('utf8');
      stdoutAll += s;
      buf += s;
      const parts = buf.split(/[\r\n]+/);
      buf = parts.pop();
      for (const line of parts) if (onEvent) onEvent({ type: 'log', line });
    };
    proc.stdout.on('data', handle);
    proc.stderr.on('data', handle);
    proc.on('error', (e) => { clearTimeout(to); reject(e); });
    proc.on('close', (code) => {
      clearTimeout(to);
      resolve({ code, output: stdoutAll });
    });
  });
}

async function uninstallProgram(program, onEvent) {
  const cmd = program.quietUninstall || program.uninstallString;
  if (!cmd) throw new Error('No uninstall string');
  if (onEvent) onEvent({ type: 'phase', phase: 'uninstall' });
  const { code, output } = await runUninstall(cmd, onEvent);
  if (code !== 0 && code !== null && code !== 3010) {
    throw new Error(`Uninstaller exited with ${code}. ${output.slice(0, 200)}`);
  }
  return { ok: true, code };
}

async function deepClean(program, onEvent) {
  const steps = [];
  const publisher = program.publisher || '';
  const name = program.name || '';
  const installLoc = program.installLocation || '';

  if (installLoc && fs.existsSync(installLoc)) {
    try {
      if (onEvent) onEvent({ type: 'log', line: `Removing folder: ${installLoc}` });
      fs.rmSync(installLoc, { recursive: true, force: true });
      steps.push({ ok: true, action: 'delete-folder', target: installLoc });
    } catch (e) {
      steps.push({ ok: false, action: 'delete-folder', target: installLoc, error: e.message });
    }
  }

  const cleanScript = `
$ErrorActionPreference = 'SilentlyContinue'
$name = '${name.replace(/'/g, "''")}'
$publisher = '${publisher.replace(/'/g, "''")}'
$key = '${(program.keyId || '').replace(/'/g, "''")}'
if ($key) { Remove-Item "Registry::$key" -Recurse -Force -EA SilentlyContinue }
$roots = @(
  'HKLM:\\SOFTWARE',
  'HKCU:\\SOFTWARE',
  'HKLM:\\SOFTWARE\\WOW6432Node'
)
$removed = 0
foreach ($r in $roots) {
  foreach ($needle in @($publisher, $name)) {
    if (-not $needle) { continue }
    $safe = $needle -replace '[\\\\/*?"<>|]', ''
    if ($safe.Length -lt 3) { continue }
    $p = Join-Path $r $safe
    if (Test-Path $p) {
      Remove-Item $p -Recurse -Force -EA SilentlyContinue
      $removed++
    }
  }
}
@{ removedKeys = $removed } | ConvertTo-Json -Compress
`;
  try {
    const res = await runPSJson(cleanScript, { timeoutMs: 20000 });
    steps.push({ ok: true, action: 'registry-clean', removed: (res && res.removedKeys) || 0 });
    if (onEvent) onEvent({ type: 'log', line: `Cleaned ${(res && res.removedKeys) || 0} registry keys` });
  } catch (e) {
    steps.push({ ok: false, action: 'registry-clean', error: e.message });
  }

  const shortcutRoots = [
    path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.PROGRAMDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.PUBLIC || '', 'Desktop'),
    path.join(process.env.USERPROFILE || '', 'Desktop'),
  ];
  const nameLower = name.toLowerCase();
  for (const root of shortcutRoots) {
    if (!root || !fs.existsSync(root)) continue;
    try {
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.toLowerCase().endsWith('.lnk') && entry.name.toLowerCase().includes(nameLower.slice(0, 10))) {
            try { fs.unlinkSync(full); steps.push({ ok: true, action: 'delete-shortcut', target: full }); } catch {}
          }
        }
      };
      walk(root);
    } catch {}
  }

  return { steps };
}

module.exports = { listInstalledPrograms, getIconDataUrl, getRegistryDetails, uninstallProgram, deepClean };
