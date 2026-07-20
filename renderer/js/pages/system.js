const LABELS = {
  cpu:         { title: 'Processor',        family: 'solid',  icon: 'fa-microchip' },
  gpu:         { title: 'Graphics',         family: 'solid',  icon: 'fa-tv' },
  motherboard: { title: 'Motherboard',      family: 'solid',  icon: 'fa-server' },
  ram:         { title: 'Memory',           family: 'solid',  icon: 'fa-memory' },
  storage:     { title: 'Storage',          family: 'solid',  icon: 'fa-hard-drive' },
  os:          { title: 'Operating System', family: 'brands', icon: 'fa-windows' },
};

const KEY_LABEL = {
  cores: 'Cores', clock: 'Clock', cache: 'Cache', load: 'Load',
  vram: 'VRAM', driver: 'Driver', date: 'Driver Date',
  chipset: 'Chipset', bios: 'BIOS', socket: 'Socket',
  total: 'Total', speed: 'Speed', slots: 'Slots', used: 'Used', health: 'Health',
  version: 'Version', arch: 'Architecture', uptime: 'Uptime',
  mediaType: 'Media', volumes: 'Volumes',
};

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function row(k, v, liveKey) {
  if (!v && !liveKey && v !== 0) return '';
  const attr = liveKey ? ` data-live="${liveKey}"` : '';
  return `<div class="hw-row"><span class="k">${KEY_LABEL[k] || k}</span><span class="v"${attr}>${escapeHtml(String(v || '—'))}</span></div>`;
}

function bar(label, pct, liveKey, color) {
  const c = color || 'var(--accent)';
  return `
    <div class="hw-bar-wrap">
      <div class="hw-bar-head">
        <span class="hw-bar-k">${label}</span>
        <span class="hw-bar-v" data-live="${liveKey}-text">${pct}%</span>
      </div>
      <div class="hw-bar"><div class="hw-bar-fill" data-live="${liveKey}" style="width:${pct}%; background:${c}"></div></div>
    </div>
  `;
}

function volumeRow(v) {
  const usedGb = (v.sizeGb || 0) - (v.freeGb || 0);
  const pct = v.sizeGb ? Math.round((usedGb * 100) / v.sizeGb) : 0;
  const color = pct >= 90 ? 'var(--crit)' : pct >= 75 ? 'var(--warn)' : 'var(--ok)';
  return `
    <div class="hw-bar-wrap">
      <div class="hw-bar-head">
        <span class="hw-bar-k"><b>${escapeHtml(v.letter)}:</b>${v.label ? ' ' + escapeHtml(v.label) : ''} <span style="color:var(--text-mute); font-size:10px">${escapeHtml(v.fs || '')}</span></span>
        <span class="hw-bar-v">${usedGb} / ${v.sizeGb} GB (${pct}%)</span>
      </div>
      <div class="hw-bar"><div class="hw-bar-fill" style="width:${pct}%; background:${color}"></div></div>
    </div>
  `;
}

function card(key, data) {
  const meta = LABELS[key];
  let body = '';

  if (key === 'cpu') {
    body = [
      row('cores', data.cores),
      row('clock', data.clock, 'cpuClock'),
      row('cache', data.cache),
      bar('CPU Load', 0, 'cpuLoad'),
    ].join('');
  } else if (key === 'gpu') {
    body = [
      data.kind ? `<div class="hw-row"><span class="k">Type</span><span class="v"><span class="tag ${data.kind === 'Discrete' ? 'accent' : 'muted'}">${escapeHtml(data.kind)}</span></span></div>` : '',
      row('vram', data.vram),
      row('driver', data.driver),
      row('date', data.date),
      bar('GPU Load', 0, 'gpuLoad'),
    ].join('');
  } else if (key === 'ram') {
    body = [
      row('total', data.total),
      row('speed', data.speed),
      row('slots', data.slots),
      bar('Memory Used', 0, 'ramLoad'),
    ].join('');
  } else if (key === 'storage') {
    const media = data.mediaType;
    const tag = media && media !== 'Unknown' ? `<span class="tag ${media === 'SSD' ? 'accent' : 'muted'}" style="margin-left:8px">${escapeHtml(media)}</span>` : '';
    const vols = Array.isArray(data.volumes) ? data.volumes : (data.volumes ? [data.volumes] : []);
    body = `
      <div class="hw-row"><span class="k">Total</span><span class="v">${escapeHtml(data.total || '—')} ${tag}</span></div>
      ${vols.length ? '<div style="margin-top: 10px">' + vols.map(volumeRow).join('') + '</div>' : ''}
    `;
  } else if (key === 'os') {
    body = [
      row('version', data.version),
      row('arch', data.arch),
      row('uptime', data.uptime, 'uptime'),
    ].join('');
  } else {
    body = Object.entries(data).filter(([k]) => k !== 'name').map(([k, v]) => row(k, v)).join('');
  }

  return `
    <div class="card hw-card">
      <div class="hw-head">
        <div class="hw-icon"><i class="fa-${meta.family} ${meta.icon}"></i></div>
        <div><div class="hw-title">${meta.title}</div></div>
      </div>
      <div class="hw-name">${escapeHtml(data.name || 'Not found')}</div>
      ${body}
    </div>
  `;
}

export async function renderSystem() {
  const res = await window.cobalt.getSystemInfo();
  if (!res.ok) {
    return `
      <div class="page-header"><div><h1 class="page-title">PC Specifications</h1></div></div>
      <div class="card" style="color:#e6a2a2">Could not read system info: ${escapeHtml(res.error)}</div>
    `;
  }
  const info = res.data;
  const cards = Object.keys(LABELS).map((k) => card(k, info[k] || { name: 'Not found' })).join('');
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">PC Specifications</h1>
        <div class="page-sub">Real-time hardware inventory via Windows WMI</div>
      </div>
      <button class="btn ghost icon-btn" onclick="location.reload()" title="Refresh"><i class="fa-solid fa-arrows-rotate"></i></button>
    </div>
    <div class="grid grid-3" data-system-grid>${cards}</div>
  `;
}

let livePoll = null;

async function pollLive(root) {
  const grid = root.querySelector('[data-system-grid]');
  if (!grid || !document.body.contains(grid)) {
    if (livePoll) { clearInterval(livePoll); livePoll = null; }
    return;
  }
  const res = await window.cobalt.getSystemLive({ includeGpu: true });
  if (!res.ok || !res.data) return;
  const d = res.data;

  const setText = (key, val) => {
    const el = grid.querySelector(`[data-live="${key}"]`);
    if (el && val != null) el.textContent = val;
  };
  const setBar = (key, pct, color) => {
    const el = grid.querySelector(`[data-live="${key}"]`);
    if (el) {
      el.style.width = Math.max(0, Math.min(100, pct)) + '%';
      if (color) el.style.background = color;
    }
    const t = grid.querySelector(`[data-live="${key}-text"]`);
    if (t) t.textContent = pct + '%';
  };

  setText('cpuClock', d.cpuClock);
  setText('uptime', d.uptime);

  const cpuPct = d.cpuLoad || 0;
  const gpuPct = d.gpuLoad || 0;
  const ramPct = d.ramPct || 0;
  setBar('cpuLoad', cpuPct, cpuPct >= 85 ? 'var(--crit)' : cpuPct >= 65 ? 'var(--warn)' : 'var(--accent)');
  setBar('gpuLoad', gpuPct, gpuPct >= 85 ? 'var(--crit)' : gpuPct >= 65 ? 'var(--warn)' : 'var(--accent)');
  setBar('ramLoad', ramPct, ramPct >= 85 ? 'var(--crit)' : ramPct >= 65 ? 'var(--warn)' : 'var(--accent)');
}

export function bindSystem(root) {
  if (livePoll) clearInterval(livePoll);
  pollLive(root);
  livePoll = setInterval(() => pollLive(root), 5000);
}
