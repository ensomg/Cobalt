let lastScan = null;
let lastScanAt = 0;
let scanning = false;
let scanLog = [];

const CACHE_MS = 60 * 60 * 1000;

export function getLastScan() {
  if (lastScan && Date.now() - lastScanAt < CACHE_MS) return lastScan;
  return null;
}

const CLASS_META = {
  display:         { label: 'Graphics',        family: 'solid',  icon: 'fa-tv' },
  monitor:         { label: 'Monitors',        family: 'solid',  icon: 'fa-display' },
  net:             { label: 'Network',         family: 'solid',  icon: 'fa-network-wired' },
  bluetooth:       { label: 'Bluetooth',       family: 'brands', icon: 'fa-bluetooth-b' },
  usb:             { label: 'USB',             family: 'solid',  icon: 'fa-plug' },
  sound:           { label: 'Audio',           family: 'solid',  icon: 'fa-volume-high' },
  media:           { label: 'Media',           family: 'solid',  icon: 'fa-photo-film' },
  system:          { label: 'System',          family: 'solid',  icon: 'fa-server' },
  hdc:             { label: 'Storage Ctrl',    family: 'solid',  icon: 'fa-hard-drive' },
  scsiadapter:     { label: 'SCSI Adapter',    family: 'solid',  icon: 'fa-hard-drive' },
  keyboard:        { label: 'Keyboard',        family: 'solid',  icon: 'fa-keyboard' },
  mouse:           { label: 'Mouse',           family: 'solid',  icon: 'fa-computer-mouse' },
  processor:       { label: 'Processor',       family: 'solid',  icon: 'fa-microchip' },
  printer:         { label: 'Printer',         family: 'solid',  icon: 'fa-print' },
  camera:          { label: 'Camera',          family: 'solid',  icon: 'fa-camera' },
  image:           { label: 'Imaging',         family: 'solid',  icon: 'fa-image' },
  biometric:       { label: 'Biometric',       family: 'solid',  icon: 'fa-fingerprint' },
  smartcardreader: { label: 'Smart Card',      family: 'solid',  icon: 'fa-id-card' },
  ports:           { label: 'Ports',           family: 'solid',  icon: 'fa-plug' },
  battery:         { label: 'Battery',         family: 'solid',  icon: 'fa-battery-full' },
  sensor:          { label: 'Sensors',         family: 'solid',  icon: 'fa-gauge' },
  '1394':          { label: 'FireWire',        family: 'solid',  icon: 'fa-plug' },
};

function metaFor(cls) { return CLASS_META[(cls || '').toLowerCase()] || { label: cls || 'Other', family: 'solid', icon: 'fa-cube' }; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const DISCRETE_HINTS = /(NVIDIA|GeForce|RTX|GTX|Quadro|Radeon RX|Radeon Pro|Intel\(R\) Arc|Intel Arc|\bArc\b)/i;
const INTEGRATED_HINTS = /(UHD|Iris|HD Graphics|Radeon Graphics|Vega \d Graphics)/i;

function gpuTag(d, all) {
  const displays = all.filter((x) => (x.klass || '').toLowerCase() === 'display');
  if (displays.length < 2) return null;
  const name = d.name || '';
  if (DISCRETE_HINTS.test(name)) return { text: 'Discrete', tone: 'accent' };
  if (INTEGRATED_HINTS.test(name)) return { text: 'Integrated', tone: 'muted' };
  return null;
}

function tagFor(d, all) { const cls = (d.klass || '').toLowerCase(); if (cls === 'display') return gpuTag(d, all); return null; }

function badge(d) {
  if (!d.version) return `<div class="badge critical">Missing</div>`;
  if (d.status && d.status !== 'OK') return `<div class="badge outdated">${escapeHtml(d.status)}</div>`;
  return `<div class="badge ok">Installed</div>`;
}

function groupBy(list) {
  const groups = {};
  for (const d of list) {
    const key = (d.klass || 'other').toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }
  return groups;
}

function summary(list) {
  const total = list.length;
  const missing = list.filter((d) => !d.version).length;
  const problem = list.filter((d) => d.status && d.status !== 'OK' && d.version).length;
  return { total, missing, problem };
}

function categoryCards(list) {
  const groups = groupBy(list);
  const keys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  return keys.map((key) => {
    const meta = metaFor(key);
    const items = groups[key];
    const missing = items.filter((d) => !d.version).length;
    return `
      <div class="scan-cat-card" data-cat="${key}">
        <div class="scan-cat-icon"><i class="fa-${meta.family} ${meta.icon}"></i></div>
        <div class="scan-cat-info">
          <div class="scan-cat-title">${escapeHtml(meta.label)}</div>
          <div class="scan-cat-count">${items.length} device${items.length === 1 ? '' : 's'}</div>
        </div>
        ${missing ? `<div class="scan-cat-warn" title="${missing} missing driver${missing === 1 ? '' : 's'}"><i class="fa-solid fa-triangle-exclamation"></i> ${missing}</div>` : '<div class="scan-cat-check"><i class="fa-solid fa-check"></i></div>'}
      </div>
    `;
  }).join('');
}

function detailModal(catKey, list) {
  const meta = metaFor(catKey);
  const items = list.filter((d) => (d.klass || '').toLowerCase() === catKey);
  const rows = items.map((d) => {
    const tag = tagFor(d, list);
    const tagHtml = tag ? `<span class="tag ${tag.tone}">${tag.text}</span>` : '';
    return `
      <div class="driver-row detail-row">
        <div class="d-icon"><i class="fa-${meta.family} ${meta.icon}"></i></div>
        <div>
          <div class="d-name">${escapeHtml(d.name)} ${tagHtml}</div>
          <div class="d-vendor">${escapeHtml(d.vendor || 'Unknown')}</div>
        </div>
        <div class="d-ver">${d.version ? escapeHtml(d.version) : '<span style="color:#e08a8a">None</span>'}</div>
        <div class="d-ver">${d.date ? escapeHtml(d.date) : '-'}</div>
        ${badge(d)}
      </div>
    `;
  }).join('');
  return `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <div class="modal-head">
          <div class="hw-icon"><i class="fa-${meta.family} ${meta.icon}"></i></div>
          <div style="flex:1">
            <div class="modal-title">${escapeHtml(meta.label)}</div>
            <div class="modal-sub">${items.length} device${items.length === 1 ? '' : 's'} connected</div>
          </div>
          <button class="btn ghost icon-btn" id="modalClose"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">${rows}</div>
      </div>
    </div>
  `;
}

function scanModal() {
  if (!scanning) return '';
  const lines = scanLog.slice(-30).map((l) =>
    `<div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:${l.status === 'ok' ? 'var(--ok)' : l.status === 'fail' ? 'var(--crit)' : 'var(--text-dim)'}">${escapeHtml(l.text)}</div>`
  ).join('');
  return `
    <div class="modal-backdrop">
      <div class="modal" style="width: min(560px, 92vw)">
        <div class="modal-head">
          <div class="hw-icon"><i class="fa-solid fa-magnifying-glass spin-loop" style="color:var(--accent)"></i></div>
          <div style="flex:1">
            <div class="modal-title">Scanning PnP devices</div>
            <div class="modal-sub">Reading Windows driver inventory...</div>
          </div>
        </div>
        <div class="modal-body" style="background: var(--bg-0); max-height: 320px; overflow-y: auto">
          ${lines || '<div style="color:var(--text-dim)">Querying Windows...</div>'}
        </div>
      </div>
    </div>
  `;
}

export async function renderScan() {
  const has = !!lastScan;
  const s = has ? summary(lastScan) : null;

  if (!has && !scanning) {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Scan System</h1>
          <div class="page-sub">Windows PnP driver inventory</div>
        </div>
      </div>
      <div class="scan-empty">
        <div class="scan-empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
        <div class="scan-empty-title">Ready to scan</div>
        <div class="scan-empty-desc">Discover all connected hardware and their driver state.</div>
        <button class="btn primary scan-btn" id="scanBtn">
          <i class="fa-solid fa-play"></i> Start Scan
        </button>
      </div>
      ${scanModal()}
    `;
  }

  const statBar = has ? `
    <div class="scan-stats">
      <div class="scan-stat">
        <div class="scan-stat-num">${s.total}</div>
        <div class="scan-stat-lbl">Devices</div>
      </div>
      <div class="scan-stat">
        <div class="scan-stat-num" style="color:${s.missing > 0 ? 'var(--crit)' : 'var(--ok)'}">${s.missing}</div>
        <div class="scan-stat-lbl">Missing</div>
      </div>
      <div class="scan-stat">
        <div class="scan-stat-num" style="color:${s.problem > 0 ? 'var(--warn)' : 'var(--ok)'}">${s.problem}</div>
        <div class="scan-stat-lbl">Issues</div>
      </div>
      <div class="scan-stat">
        <div class="scan-stat-num" style="color:var(--ok)">${s.total - s.missing - s.problem}</div>
        <div class="scan-stat-lbl">Healthy</div>
      </div>
    </div>
  ` : '';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Scan System</h1>
        <div class="page-sub">${has ? 'Windows PnP inventory · last scan just now' : 'Scanning...'}</div>
      </div>
      ${has ? `<button class="btn ghost icon-btn" id="rescanBtn" title="Rescan"><i class="fa-solid fa-arrows-rotate"></i></button>` : ''}
    </div>
    ${statBar}
    ${has ? `<div class="scan-grid">${categoryCards(lastScan)}</div>` : ''}
    <div id="modalMount"></div>
    ${scanModal()}
  `;
}

async function runScan(root) {
  scanning = true;
  scanLog = [{ status: 'info', text: 'Starting driver scan...' }];
  await rerender(root);

  scanLog.push({ status: 'info', text: 'Querying Get-PnpDevice...' });
  await rerender(root);
  const t0 = Date.now();
  const res = await window.cobalt.scanDrivers();
  const ms = Date.now() - t0;

  if (!res.ok) {
    scanLog.push({ status: 'fail', text: `Failed: ${res.error}` });
    scanning = false;
    await rerender(root);
    return;
  }

  lastScan = res.data;
  lastScanAt = Date.now();
  const s = summary(lastScan);
  scanLog.push({ status: 'ok', text: `✓ Scan complete in ${ms}ms` });
  scanLog.push({ status: 'ok', text: `  ${s.total} devices found · ${s.missing} missing · ${s.problem} with issues` });
  await rerender(root);

  await new Promise((r) => setTimeout(r, 600));
  scanning = false;
  try {
    window.cobalt.notify({ title: 'Cobalt: Scan complete', body: `${s.total} devices found, ${s.missing} missing driver${s.missing === 1 ? '' : 's'}.` });
  } catch {}
  await rerender(root);
}

function bindCategoryCards(root) {
  root.querySelectorAll('.scan-cat-card').forEach((card) => {
    card.addEventListener('click', () => openModal(root, card.dataset.cat));
  });
}

function openModal(root, catKey) {
  const mount = root.querySelector('#modalMount');
  mount.innerHTML = detailModal(catKey, lastScan);
  const backdrop = mount.querySelector('#modalBackdrop');
  const close = () => { mount.innerHTML = ''; };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  mount.querySelector('#modalClose').addEventListener('click', close);
  const esc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
}

export function bindScan(root) {
  const scanBtn = root.querySelector('#scanBtn');
  const rescanBtn = root.querySelector('#rescanBtn');
  if (scanBtn) scanBtn.addEventListener('click', () => runScan(root));
  if (rescanBtn) rescanBtn.addEventListener('click', () => runScan(root));
  bindCategoryCards(root);
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('scan')) return;
  root.innerHTML = `<div class="page">${await renderScan()}</div>`;
  bindScan(root);
}
