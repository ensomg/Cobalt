const { runPS, runPSJson } = require('./ps');
const { spawn } = require('child_process');

const PRESETS = [
  { id: 'auto',       name: 'DHCP (Automatic)', primary: null,           secondary: null,           desc: 'Use DNS servers assigned by your router.', icon: 'fa-arrows-rotate', color: '#888888' },
  { id: 'cloudflare', name: 'Cloudflare',       primary: '1.1.1.1',      secondary: '1.0.0.1',      desc: 'Fastest general DNS, privacy-focused.',   icon: 'fa-cloud',        color: '#f38020' },
  { id: 'cf-family',  name: 'Cloudflare Family',primary: '1.1.1.3',      secondary: '1.0.0.3',      desc: 'Blocks malware + adult content.',         icon: 'fa-shield',       color: '#f38020' },
  { id: 'google',     name: 'Google',           primary: '8.8.8.8',      secondary: '8.8.4.4',      desc: 'Widely used, reliable Google DNS.',       icon: 'fa-magnifying-glass', color: '#4285f4' },
  { id: 'quad9',      name: 'Quad9',            primary: '9.9.9.9',      secondary: '149.112.112.112', desc: 'Blocks malicious domains automatically.', icon: 'fa-shield-halved', color: '#8ac9f5' },
  { id: 'opendns',    name: 'OpenDNS',          primary: '208.67.222.222', secondary: '208.67.220.220', desc: 'Cisco OpenDNS, phishing protection.',    icon: 'fa-eye',          color: '#33cccc' },
  { id: 'adguard',    name: 'AdGuard',          primary: '94.140.14.14', secondary: '94.140.15.15', desc: 'Blocks ads and trackers at DNS level.',   icon: 'fa-ban',          color: '#68bc71' },
  { id: 'controld-safe', name: 'Control D (Safe)', primary: '76.76.2.11', secondary: '76.76.10.11', desc: 'Blocks malware, ads and trackers.',       icon: 'fa-shield-cat',   color: '#7c3aed' },
];

const PING_HOSTS = [
  { id: 'google',    label: 'Google',    host: 'google.com',     icon: 'fa-google' },
  { id: 'youtube',   label: 'YouTube',   host: 'youtube.com',    icon: 'fa-youtube' },
  { id: 'instagram', label: 'Instagram', host: 'instagram.com',  icon: 'fa-instagram' },
  { id: 'twitch',    label: 'Twitch',    host: 'twitch.tv',      icon: 'fa-twitch' },
  { id: 'discord',   label: 'Discord',   host: 'discord.com',    icon: 'fa-discord' },
  { id: 'x',         label: 'X/Twitter', host: 'x.com',          icon: 'fa-x-twitter' },
  { id: 'github',    label: 'GitHub',    host: 'github.com',     icon: 'fa-github' },
  { id: 'cloudflare',label: 'Cloudflare',host: '1.1.1.1',        icon: 'fa-cloud' },
];

async function getCurrentDns() {
  const script = `
$out = @()
Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
  $ada = $_
  $srv = Get-DnsClientServerAddress -InterfaceIndex $ada.ifIndex -AddressFamily IPv4 -EA SilentlyContinue
  $out += [ordered]@{
    interface = $ada.Name
    ifIndex   = $ada.ifIndex
    dns       = @($srv.ServerAddresses)
  }
}
$out | ConvertTo-Json -Compress -Depth 3
`;
  const data = await runPSJson(script, { timeoutMs: 15000 });
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

async function setDns(preset) {
  const p = PRESETS.find((x) => x.id === preset);
  if (!p) throw new Error('Unknown preset');
  const script = p.primary
    ? `
Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
  try {
    Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ('${p.primary}','${p.secondary}') -EA Stop
    Write-Host ('OK::' + $_.Name)
  } catch { Write-Host ('FAIL::' + $_.Name + '::' + $_.Exception.Message) }
}
Clear-DnsClientCache
`
    : `
Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
  try {
    Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses -EA Stop
    Write-Host ('OK::' + $_.Name)
  } catch { Write-Host ('FAIL::' + $_.Name + '::' + $_.Exception.Message) }
}
Clear-DnsClientCache
`;
  const out = await runPS(script, { timeoutMs: 20000 });
  const ok = [];
  const fail = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('OK::')) ok.push(line.slice(4));
    else if (line.startsWith('FAIL::')) { const [_, name, ...rest] = line.split('::'); fail.push({ name, error: rest.join('::') }); }
  }
  return { ok, fail };
}

function pingHost(host) {
  return new Promise((resolve) => {
    const p = spawn('ping', ['-n', '4', host], { windowsHide: true });
    let out = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => {
      const times = [...out.matchAll(/(?:time|zaman)[=<](\d+)\s?ms/gi)].map((m) => parseInt(m[1], 10));
      const lossM = out.match(/(\d+)%\s*loss|(\d+)%\s*kay[ıi]p/i);
      const loss = lossM ? parseInt(lossM[1] || lossM[2], 10) : 0;
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
      const min = times.length ? Math.min(...times) : null;
      const max = times.length ? Math.max(...times) : null;
      resolve({ host, avg, min, max, loss, samples: times.length });
    });
    p.on('error', () => resolve({ host, avg: null, error: 'ping failed' }));
    setTimeout(() => { try { p.kill(); } catch {} }, 15000);
  });
}

async function pingAll() {
  const results = await Promise.all(PING_HOSTS.map((h) => pingHost(h.host).then((r) => ({ ...h, ...r }))));
  return results;
}

module.exports = { PRESETS, PING_HOSTS, getCurrentDns, setDns, pingHost, pingAll };
