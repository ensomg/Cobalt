let targets = [];
let sizes = {};
let selected = new Set();
let scanning = false;
let cleaning = false;
let cleaningLog = [];
let loadStarted = false;
let lastResult = null;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtBytes(b) {
  if (!b || b === 0) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function totalSize() {
  let s = 0;
  for (const t of targets) if (selected.has(t.id)) s += sizes[t.id] || 0;
  return s;
}

function targetRow(t) {
  const size = sizes[t.id];
  const has = size != null;
  const isSel = selected.has(t.id);
  return `
    <label class="opt-item" data-tid="${t.id}">
      <input type="checkbox" ${isSel ? 'checked' : ''} data-cb="${t.id}" ${cleaning ? 'disabled' : ''} />
      <div class="opt-body">
        <div class="opt-title">
          ${escapeHtml(t.title)}
          ${t.risk === 'warn' ? '<span class="tag" style="background:rgba(230,199,106,0.15); color:var(--warn); margin-left:8px">Caution</span>' : ''}
        </div>
        <div class="opt-desc">${escapeHtml(t.desc)}</div>
      </div>
      <div class="cleanup-size">${has ? fmtBytes(size) : (scanning ? '<i class="fa-solid fa-spinner spin-loop"></i>' : '—')}</div>
    </label>
  `;
}

const CATEGORIES = [
  { title: 'Windows Cache',   filter: (t) => /win-temp|prefetch|thumb-cache|font-cache|error-reports|cbs-logs/.test(t.id) },
  { title: 'User Data',       filter: (t) => t.id === 'user-temp' || t.id === 'recycle-bin' },
  { title: 'Windows Update',  filter: (t) => t.id === 'wu-cache' || t.id === 'delivery-opt' },
  { title: 'Browsers',        filter: (t) => t.id.endsWith('-cache') && !/win-temp|thumb-cache|font-cache/.test(t.id) },
  { title: 'Network',         filter: (t) => t.id === 'dns-cache' },
];

function progressModal() {
  if (!cleaning) return '';
  const logHtml = cleaningLog.slice(-40).map((l) =>
    `<div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:${l.status === 'ok' ? 'var(--ok)' : l.status === 'fail' ? 'var(--crit)' : 'var(--text-dim)'}">${escapeHtml(l.text)}</div>`
  ).join('');
  return `
    <div class="modal-backdrop">
      <div class="modal" style="width: min(720px, 90vw)">
        <div class="modal-head">
          <div class="hw-icon"><i class="fa-solid fa-broom spin-loop"></i></div>
          <div style="flex:1">
            <div class="modal-title">Cleaning in progress</div>
            <div class="modal-sub">${cleaningLog.length} of ${selected.size || cleaningLog.length} operations logged</div>
          </div>
        </div>
        <div class="modal-body" style="max-height: 400px; overflow-y: auto; background: var(--bg-0)">
          ${logHtml || '<div style="color:var(--text-dim)">Starting...</div>'}
        </div>
      </div>
    </div>
  `;
}

export async function renderCleanup() {
  const cats = CATEGORIES.map((c) => {
    const items = targets.filter(c.filter);
    if (!items.length) return '';
    return `
      <div class="opt-section">
        <div class="opt-section-head">
          <div class="opt-section-title">${c.title}</div>
          <div class="opt-section-count">${items.length}</div>
        </div>
        <div class="opt-grid">${items.map(targetRow).join('')}</div>
      </div>
    `;
  }).join('');

  const total = totalSize();
  const totalTargets = Object.values(sizes).reduce((a, b) => a + (b || 0), 0);
  const resultCard = lastResult ? `
    <div class="card" style="display:flex; align-items:center; gap:12px; margin-bottom:14px; border-color: rgba(107, 207, 138, 0.35)">
      <i class="fa-solid fa-broom" style="color:var(--ok); font-size:18px"></i>
      <div style="flex:1"><b>Cleanup complete.</b> ${lastResult.cleaned ? lastResult.cleaned.length : 0} targets cleaned ${lastResult.failed && lastResult.failed.length ? '<span style="color:var(--crit)">· ' + lastResult.failed.length + ' failed</span>' : ''} ${lastResult.freedBytes ? '· <span style="color:var(--ok)">Freed ' + fmtBytes(lastResult.freedBytes) + '</span>' : ''}</div>
      <button class="btn ghost small" id="clearRes"><i class="fa-solid fa-xmark"></i></button>
    </div>
  ` : '';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Disk Cleanup</h1>
        <div class="page-sub">Total scannable: <b>${fmtBytes(totalTargets)}</b> · Selected: <b>${fmtBytes(total)}</b></div>
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn ghost" id="scanBtn" ${scanning || cleaning ? 'disabled' : ''}>${scanning ? '<i class="fa-solid fa-spinner spin-loop"></i> Scanning' : '<i class="fa-solid fa-arrows-rotate"></i> Scan Sizes'}</button>
        <button class="btn primary" id="cleanBtn" ${!selected.size || cleaning ? 'disabled' : ''}>${cleaning ? '<i class="fa-solid fa-spinner spin-loop"></i> Cleaning' : '<i class="fa-solid fa-broom"></i> Clean Selected (' + selected.size + ')'}</button>
      </div>
    </div>
    ${resultCard}
    ${cats}
    ${progressModal()}
  `;
}

async function loadInitial(root) {
  scanning = true;
  await rerender(root);
  const res = await window.cobalt.cleanupScan();
  scanning = false;
  if (res.ok) sizes = res.data;
  await rerender(root);
}

async function runClean(root) {
  cleaning = true;
  cleaningLog = [{ status: 'info', text: 'Preparing...' }];
  const preSize = Object.entries(sizes).filter(([id]) => selected.has(id)).reduce((a, [, v]) => a + (v || 0), 0);
  await rerender(root);

  const ids = Array.from(selected);
  for (const id of ids) {
    const t = targets.find((x) => x.id === id);
    cleaningLog.push({ status: 'info', text: `Cleaning: ${t ? t.title : id}` });
    await rerender(root);
    const res = await window.cobalt.cleanupClean([id]);
    if (res.ok && (!res.data.failed || !res.data.failed.length)) {
      cleaningLog.push({ status: 'ok', text: `  ✓ Cleaned: ${t ? t.title : id}` });
    } else {
      cleaningLog.push({ status: 'fail', text: `  ✗ Failed: ${(res.data && res.data.failed && res.data.failed[0] && res.data.failed[0].error) || res.error || 'unknown'}` });
    }
    await rerender(root);
  }

  cleaning = false;
  const rescan = await window.cobalt.cleanupScan();
  const postSize = rescan.ok
    ? Object.entries(rescan.data).filter(([id]) => ids.includes(id)).reduce((a, [, v]) => a + (v || 0), 0)
    : 0;
  if (rescan.ok) sizes = rescan.data;
  const freed = Math.max(0, preSize - postSize);
  lastResult = {
    cleaned: ids.filter((_, i) => cleaningLog.some((l) => l.status === 'ok')),
    failed: cleaningLog.filter((l) => l.status === 'fail'),
    freedBytes: freed,
  };
  selected.clear();

  try {
    window.cobalt.notify({ title: 'Cleanup complete', body: `Freed ${fmtBytes(freed)} across ${ids.length} target${ids.length === 1 ? '' : 's'}.` });
  } catch {}

  cleaningLog = [];
  await rerender(root);
}

export function bindCleanup(root) {
  if (!loadStarted) {
    loadStarted = true;
    (async () => {
      targets = await fetchTargetsMeta();
      await rerender(root);
      loadInitial(root);
    })();
    return;
  }

  root.querySelectorAll('[data-cb]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.cb;
      if (cb.checked) selected.add(id); else selected.delete(id);
      const btn = root.querySelector('#cleanBtn');
      if (btn) {
        btn.disabled = !selected.size || cleaning;
        btn.innerHTML = `<i class="fa-solid fa-broom"></i> Clean Selected (${selected.size})`;
      }
      const hd = root.querySelector('.page-sub');
      if (hd) hd.innerHTML = `Total scannable: <b>${fmtBytes(Object.values(sizes).reduce((a, b) => a + (b || 0), 0))}</b> · Selected: <b>${fmtBytes(totalSize())}</b>`;
    });
  });

  const scanBtn = root.querySelector('#scanBtn');
  if (scanBtn) scanBtn.addEventListener('click', () => loadInitial(root));
  const cleanBtn = root.querySelector('#cleanBtn');
  if (cleanBtn) cleanBtn.addEventListener('click', () => runClean(root));
  const clearBtn = root.querySelector('#clearRes');
  if (clearBtn) clearBtn.addEventListener('click', () => { lastResult = null; rerender(root); });
}

async function fetchTargetsMeta() {
  return [
    { id: 'user-temp',    title: 'User Temp Files',       risk: 'safe', desc: 'Files in %TEMP% folder.' },
    { id: 'win-temp',     title: 'Windows Temp',          risk: 'safe', desc: 'System temporary files.' },
    { id: 'prefetch',     title: 'Prefetch Cache',        risk: 'safe', desc: 'Boot/app prefetch entries.' },
    { id: 'thumb-cache',  title: 'Thumbnail Cache',       risk: 'safe', desc: 'Windows Explorer thumbnails (regenerated automatically).' },
    { id: 'wu-cache',     title: 'Windows Update Cache',  risk: 'safe', desc: 'Old Windows Update downloads.' },
    { id: 'delivery-opt', title: 'Delivery Optimization', risk: 'safe', desc: 'Peer-to-peer WU cache.' },
    { id: 'cbs-logs',     title: 'CBS Logs',              risk: 'safe', desc: 'Windows servicing log files.' },
    { id: 'chrome-cache', title: 'Chrome Cache',          risk: 'safe', desc: 'Google Chrome browser cache.' },
    { id: 'edge-cache',   title: 'Edge Cache',            risk: 'safe', desc: 'Microsoft Edge cache.' },
    { id: 'firefox-cache',title: 'Firefox Cache',         risk: 'safe', desc: 'Mozilla Firefox cache.' },
    { id: 'brave-cache',  title: 'Brave Cache',           risk: 'safe', desc: 'Brave browser cache.' },
    { id: 'recycle-bin',  title: 'Recycle Bin',           risk: 'warn', desc: 'Empty the Recycle Bin (deletes permanently).' },
    { id: 'dns-cache',    title: 'DNS Cache',             risk: 'safe', desc: 'Flush DNS resolver cache.' },
    { id: 'font-cache',   title: 'Font Cache',            risk: 'safe', desc: 'Windows font cache.' },
    { id: 'error-reports',title: 'Error Reports',         risk: 'safe', desc: 'Windows Error Reporting queue.' },
  ];
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('cleanup')) return;
  root.innerHTML = `<div class="page">${await renderCleanup()}</div>`;
  bindCleanup(root);
}
