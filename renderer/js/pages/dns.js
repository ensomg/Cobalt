import { toast } from '../ui/toast.js';

let presets = [];
let hosts = [];
let current = [];
let pingResults = [];
let loading = true;
let pinging = false;
let applying = false;
let loadStarted = false;

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function currentDnsList() {
  if (!current.length) return '<div class="opt-desc">No active interfaces detected.</div>';
  return current.map((c) => `
    <div class="dns-iface">
      <div class="dns-iface-icon"><i class="fa-solid fa-network-wired"></i></div>
      <div style="flex:1">
        <div class="dns-iface-name">${escapeHtml(c.interface)}</div>
        <div class="dns-iface-servers">${(c.dns && c.dns.length) ? c.dns.map(escapeHtml).join(' &middot; ') : '<span style="color:var(--text-mute)">(automatic / DHCP)</span>'}</div>
      </div>
    </div>
  `).join('');
}

function pingColor(ms) {
  if (ms == null) return 'var(--crit)';
  if (ms < 40) return 'var(--ok)';
  if (ms < 100) return 'var(--warn)';
  return 'var(--crit)';
}

function pingList() {
  if (pinging) {
    return hosts.map((h) => `
      <div class="ping-row">
        <div class="ping-icon"><i class="fa-brands ${h.icon}"></i></div>
        <div style="flex:1"><div class="ping-name">${escapeHtml(h.label)}</div><div class="ping-host">${escapeHtml(h.host)}</div></div>
        <div class="ping-time"><i class="fa-solid fa-spinner spin-loop"></i></div>
      </div>
    `).join('');
  }
  if (!pingResults.length) {
    return '<div class="card" style="text-align:center; color:var(--text-dim); padding: 30px">Click "Run Ping Test" to measure latency to major platforms.</div>';
  }
  return pingResults.map((r) => {
    const color = pingColor(r.avg);
    return `
      <div class="ping-row">
        <div class="ping-icon"><i class="fa-brands ${r.icon}"></i></div>
        <div style="flex:1">
          <div class="ping-name">${escapeHtml(r.label)}</div>
          <div class="ping-host">${escapeHtml(r.host)}${r.loss ? ' · <span style="color:var(--crit)">' + r.loss + '% loss</span>' : ''}</div>
        </div>
        <div class="ping-time" style="color:${color}">${r.avg != null ? r.avg + ' ms' : '—'}</div>
      </div>
    `;
  }).join('');
}

export async function renderDns() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">DNS Manager</h1>
        <div class="page-sub">Set DNS servers and measure latency to popular services</div>
      </div>
      <button class="btn ghost icon-btn" id="dnsRefresh" title="Refresh"><i class="fa-solid fa-arrows-rotate ${loading ? 'spin-loop' : ''}"></i></button>
    </div>

    <div class="card" style="margin-bottom: 14px">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-dim); font-weight: 600; margin-bottom: 10px">Current DNS</div>
      ${loading ? '<div style="display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading network adapters...</div>' : currentDnsList()}
    </div>

    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-globe" style="color:var(--accent)"></i>
        <div class="opt-section-title">DNS Presets</div>
      </div>
      <div class="dns-grid">
        ${presets.map((p) => `
          <div class="dns-card" data-preset="${p.id}">
            <div class="dns-icon" style="background:${p.color}20; color:${p.color}"><i class="fa-solid ${p.icon}"></i></div>
            <div class="dns-info">
              <div class="dns-name">${escapeHtml(p.name)}</div>
              <div class="dns-desc">${escapeHtml(p.desc)}</div>
              ${p.primary ? `<div class="dns-servers">${escapeHtml(p.primary)} &middot; ${escapeHtml(p.secondary)}</div>` : '<div class="dns-servers">(automatic)</div>'}
            </div>
            <button class="btn primary small dns-apply" data-preset="${p.id}" ${applying ? 'disabled' : ''}>${applying ? '<i class="fa-solid fa-spinner spin-loop"></i>' : 'Apply'}</button>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-gauge" style="color:var(--accent)"></i>
        <div class="opt-section-title">Latency Test</div>
        <button class="btn ghost small" id="pingBtn" ${pinging ? 'disabled' : ''} style="margin-left:auto">${pinging ? '<i class="fa-solid fa-spinner spin-loop"></i> Pinging' : '<i class="fa-solid fa-play"></i> Run Ping Test'}</button>
      </div>
      <div class="ping-list">${pingList()}</div>
    </div>
  `;
}

async function load(root) {
  loading = true;
  await rerender(root);
  try {
    const [listRes, curRes] = await Promise.all([window.cobalt.dnsList(), window.cobalt.dnsCurrent()]);
    if (listRes.ok) { presets = listRes.data.presets; hosts = listRes.data.hosts; }
    if (curRes.ok) current = curRes.data;
  } catch {}
  loading = false;
  await rerender(root);
}

async function runPing(root) {
  pinging = true;
  await rerender(root);
  const res = await window.cobalt.dnsPingAll();
  pinging = false;
  if (res.ok) pingResults = res.data;
  toast({ title: 'Cobalt: Ping test complete', body: `Median latency: ${Math.round(pingResults.reduce((a, r) => a + (r.avg || 0), 0) / pingResults.length)}ms`, kind: 'ok' });
  await rerender(root);
}

async function applyPreset(root, preset) {
  applying = true;
  await rerender(root);
  const res = await window.cobalt.dnsSet(preset);
  applying = false;
  if (res.ok) {
    const cur = await window.cobalt.dnsCurrent();
    if (cur.ok) current = cur.data;
    const p = presets.find((x) => x.id === preset);
    toast({ title: `DNS set to ${p ? p.name : preset}`, body: `Applied to ${res.data.ok.length} interface${res.data.ok.length === 1 ? '' : 's'}. DNS cache flushed.`, kind: 'ok' });
  } else {
    toast({ title: 'DNS change failed', body: res.error, kind: 'fail' });
  }
  await rerender(root);
}

export function bindDns(root) {
  if (!loadStarted) { loadStarted = true; load(root); return; }

  const refresh = root.querySelector('#dnsRefresh');
  if (refresh) refresh.addEventListener('click', () => load(root));

  root.querySelectorAll('.dns-apply').forEach((b) => b.addEventListener('click', () => applyPreset(root, b.dataset.preset)));

  const pingBtn = root.querySelector('#pingBtn');
  if (pingBtn) pingBtn.addEventListener('click', () => runPing(root));
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('dns')) return;
  root.innerHTML = `<div class="page">${await renderDns()}</div>`;
  bindDns(root);
}
