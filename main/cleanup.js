const { runPSJson, runPS } = require('./ps');

const TARGETS = [
  { id: 'user-temp',    title: 'User Temp Files',            path: '$env:TEMP',                                        risk: 'safe',   desc: 'Files in %TEMP% older than 1 hour.' },
  { id: 'win-temp',     title: 'Windows Temp',               path: 'C:\\Windows\\Temp',                                risk: 'safe',   desc: 'System temporary files.' },
  { id: 'prefetch',     title: 'Prefetch Cache',             path: 'C:\\Windows\\Prefetch',                            risk: 'safe',   desc: 'Boot/app prefetch entries.' },
  { id: 'thumb-cache',  title: 'Thumbnail Cache',            path: '$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer',   risk: 'safe',   desc: 'Windows Explorer thumbnails cache (regenerated).' },
  { id: 'wu-cache',     title: 'Windows Update Cache',       path: 'C:\\Windows\\SoftwareDistribution\\Download',      risk: 'safe',   desc: 'Old Windows Update downloads.' },
  { id: 'delivery-opt', title: 'Delivery Optimization',      path: 'C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization\\Cache', risk: 'safe', desc: 'Peer-to-peer Windows Update cache.' },
  { id: 'cbs-logs',     title: 'CBS Logs',                   path: 'C:\\Windows\\Logs\\CBS',                           risk: 'safe',   desc: 'Windows servicing log files.' },
  { id: 'chrome-cache', title: 'Chrome Cache',               path: '$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache', risk: 'safe', desc: 'Google Chrome browser cache.' },
  { id: 'edge-cache',   title: 'Edge Cache',                 path: '$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache', risk: 'safe', desc: 'Microsoft Edge browser cache.' },
  { id: 'firefox-cache',title: 'Firefox Cache',              path: '$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles',    risk: 'safe',   desc: 'Firefox cache2 directory.', filter: 'cache2' },
  { id: 'brave-cache',  title: 'Brave Cache',                path: '$env:LOCALAPPDATA\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache', risk: 'safe', desc: 'Brave browser cache.' },
  { id: 'recycle-bin',  title: 'Recycle Bin',                path: 'special:recycle',                                   risk: 'warn',  desc: 'Empty the Recycle Bin.' },
  { id: 'dns-cache',    title: 'DNS Cache',                  path: 'special:dns',                                       risk: 'safe',   desc: 'Flush DNS resolver cache.' },
  { id: 'font-cache',   title: 'Font Cache',                 path: 'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\FontCache', risk: 'safe', desc: 'Windows font cache files.' },
  { id: 'error-reports',title: 'Error Reports',              path: 'C:\\ProgramData\\Microsoft\\Windows\\WER',         risk: 'safe',   desc: 'Windows Error Reporting queue.' },
];

async function scanSizes() {
  const parts = TARGETS.map((t, i) => {
    if (t.path === 'special:recycle') {
      return `$sz${i} = 0; try { $bin=(New-Object -ComObject Shell.Application).NameSpace(10); foreach ($it in $bin.Items()) { $sz${i} += $it.Size } } catch {}`;
    }
    if (t.path === 'special:dns') return `$sz${i} = 0`;
    const path = t.path;
    const filter = t.filter || '*';
    return `$sz${i} = 0; try {
      $p = "${path}"
      if (Test-Path $p) {
        $opts = New-Object System.IO.EnumerationOptions
        $opts.IgnoreInaccessible = $true
        $opts.RecurseSubdirectories = $true
        $opts.AttributesToSkip = 'ReparsePoint'
        $total = [int64]0
        foreach ($f in [System.IO.Directory]::EnumerateFiles($p, '${filter}', $opts)) {
          try { $total += (New-Object System.IO.FileInfo $f).Length } catch {}
        }
        $sz${i} = $total
      }
    } catch { $sz${i} = 0 }`;
  }).join('; ');
  const inserts = TARGETS.map((t, i) => `$r['${t.id}'] = [int64]$sz${i}`).join('; ');
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
${parts}
$r = [ordered]@{}
${inserts}
$r | ConvertTo-Json -Compress
`;
  const data = await runPSJson(script, { timeoutMs: 180000 });
  return data || {};
}

async function clean(ids) {
  const lines = [];
  for (const id of ids) {
    const t = TARGETS.find((x) => x.id === id);
    if (!t) continue;
    if (t.path === 'special:recycle') {
      lines.push(`try { Clear-RecycleBin -Force -EA Stop; Write-Host 'OK::${id}' } catch { Write-Host ('FAIL::${id}::' + $_.Exception.Message) }`);
    } else if (t.path === 'special:dns') {
      lines.push(`try { Clear-DnsClientCache -EA Stop; Write-Host 'OK::${id}' } catch { Write-Host ('FAIL::${id}::' + $_.Exception.Message) }`);
    } else {
      const cmd = t.filter
        ? `Get-ChildItem "${t.path}" -Filter '${t.filter}' -Recurse -Force -EA SilentlyContinue | Remove-Item -Recurse -Force -EA SilentlyContinue`
        : `Get-ChildItem "${t.path}" -Force -EA SilentlyContinue | Remove-Item -Recurse -Force -EA SilentlyContinue`;
      lines.push(`try { ${cmd}; Write-Host 'OK::${id}' } catch { Write-Host ('FAIL::${id}::' + $_.Exception.Message) }`);
    }
  }
  if (!lines.length) return { cleaned: [], failed: [] };
  const out = await runPS(lines.join('; '), { timeoutMs: 120000 });
  const cleaned = [];
  const failed = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('OK::')) cleaned.push(line.slice(4));
    else if (line.startsWith('FAIL::')) {
      const [_, id, ...rest] = line.split('::');
      failed.push({ id, error: rest.join('::') });
    }
  }
  return { cleaned, failed };
}

module.exports = { TARGETS, scanSizes, clean };
