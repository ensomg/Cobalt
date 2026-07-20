import { confirmDialog } from '../ui/confirm.js';

let programs = [];
let loading = true;
let loadStarted = false;
let searchQuery = '';
let sortBy = 'name';
let selectedProgram = null;
let selectedDetails = null;
const iconCache = new Map();
const opState = {};

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtSize(mb) {
  if (!mb) return '';
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb + ' MB';
}

function fallbackIcon(p) {
  const n = (p.name || '').toLowerCase();
  const rules = [
    { re: /steam|epic|xbox|game|riot|valorant|league|blizzard|ubisoft|rockstar/, icon: 'fa-gamepad' },
    { re: /chrome|firefox|edge|brave|opera|browser|vivaldi/, icon: 'fa-globe' },
    { re: /vscode|visual studio|jetbrains|intellij|pycharm|node|python|git|docker|postman/, icon: 'fa-code' },
    { re: /adobe|photoshop|premiere/, icon: 'fa-paintbrush' },
    { re: /office|word|excel|outlook|onenote|teams/, icon: 'fa-briefcase' },
    { re: /discord|slack|zoom|whatsapp|signal|telegram/, icon: 'fa-comments' },
    { re: /nvidia|amd|intel|realtek|driver/, icon: 'fa-microchip' },
    { re: /vlc|spotify|obs|audacity|handbrake|foobar/, icon: 'fa-photo-film' },
    { re: /malwarebytes|defender|kaspersky|avast|bitdefender|norton/, icon: 'fa-shield-halved' },
    { re: /7-zip|winrar|peazip|bandizip/, icon: 'fa-file-zipper' },
  ];
  for (const r of rules) if (r.re.test(n)) return r.icon;
  return 'fa-cube';
}

function filtered() {
  const q = searchQuery.trim().toLowerCase();
  let list = programs;
  if (q) list = list.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.publisher || '').toLowerCase().includes(q));
  if (sortBy === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sortBy === 'size') list = [...list].sort((a, b) => (b.sizeMb || 0) - (a.sizeMb || 0));
  else if (sortBy === 'date') list = [...list].sort((a, b) => (b.installDate || '').localeCompare(a.installDate || ''));
  return list;
}

function programRow(p) {
  const op = opState[p.keyId];
  const iconData = iconCache.get(p.keyId);
  const iconHtml = iconData
    ? `<img class="unin-icon-img" src="${iconData}" alt="" />`
    : `<div class="unin-icon-fb"><i class="fa-solid ${fallbackIcon(p)}"></i></div>`;
  const state = op ? `<span class="tag ${op.status === 'failed' ? 'muted' : 'accent'}">${escapeHtml(op.status)}</span>` : '';
  return `
    <div class="unin-row" data-key="${escapeHtml(p.keyId)}">
      <div class="unin-icon">${iconHtml}</div>
      <div style="flex:1; min-width:0">
        <div class="unin-name">${escapeHtml(p.name)} ${state}</div>
        <div class="unin-meta">
          <span>${escapeHtml(p.publisher || 'Unknown')}</span>
          ${p.version ? `<span class="dot"></span><span>${escapeHtml(p.version)}</span>` : ''}
          ${p.sizeMb ? `<span class="dot"></span><span>${fmtSize(p.sizeMb)}</span>` : ''}
          ${p.installDate ? `<span class="dot"></span><span>${escapeHtml(p.installDate)}</span>` : ''}
        </div>
        ${p.installLocation ? `<div class="unin-path"><i class="fa-solid fa-folder"></i> ${escapeHtml(p.installLocation)}</div>` : ''}
      </div>
      <div class="unin-actions">
        <button class="btn ghost small" data-act="details" data-key="${escapeHtml(p.keyId)}"><i class="fa-solid fa-magnifying-glass"></i> Details</button>
        <button class="btn primary small" data-act="uninstall" data-key="${escapeHtml(p.keyId)}" ${!p.uninstallString || op ? 'disabled' : ''}><i class="fa-solid fa-trash"></i> Uninstall</button>
      </div>
    </div>
  `;
}

function detailModalHtml() {
  if (!selectedProgram) return '';
  const p = selectedProgram;
  const d = selectedDetails;
  const iconData = iconCache.get(p.keyId);
  const iconHtml = iconData
    ? `<img class="unin-icon-img" style="width:56px;height:56px" src="${iconData}" alt="" />`
    : `<div class="unin-icon-fb" style="width:56px;height:56px"><i class="fa-solid ${fallbackIcon(p)}"></i></div>`;
  const values = d && d.values ? Object.entries(d.values).map(([k, v]) => `
    <div class="detail-kv"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>
  `).join('') : '<div style="color:var(--text-dim)">Loading registry data...</div>';

  return `
    <div class="modal-backdrop" id="uninModal">
      <div class="modal" style="width: min(920px, 92vw)">
        <div class="modal-head">
          ${iconHtml}
          <div style="flex:1; min-width:0">
            <div class="modal-title">${escapeHtml(p.name)}</div>
            <div class="modal-sub">${escapeHtml(p.publisher || 'Unknown')} ${p.version ? '· ' + escapeHtml(p.version) : ''} ${p.sizeMb ? '· ' + fmtSize(p.sizeMb) : ''}</div>
          </div>
          <button class="btn ghost icon-btn" id="uninModalClose"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <div class="detail-h">Install Location</div>
            <div class="detail-p">${escapeHtml(p.installLocation || '(not set)')}</div>
          </div>
          <div class="detail-section">
            <div class="detail-h">Registry Key</div>
            <div class="detail-p mono">${escapeHtml(p.keyId)}</div>
          </div>
          <div class="detail-section">
            <div class="detail-h">Uninstall Command</div>
            <div class="detail-p mono">${escapeHtml(p.quietUninstall || p.uninstallString || '(none)')}</div>
          </div>
          ${p.urlInfo ? `<div class="detail-section"><div class="detail-h">Publisher URL</div><div class="detail-p">${escapeHtml(p.urlInfo)}</div></div>` : ''}
          <div class="detail-section">
            <div class="detail-h">Registry Values</div>
            <div class="detail-kv-list">${values}</div>
          </div>
          <div style="display:flex; gap:8px; margin-top: 18px">
            <button class="btn primary" id="uninRunBtn" ${!p.uninstallString ? 'disabled' : ''}><i class="fa-solid fa-trash"></i> Uninstall</button>
            <button class="btn" id="uninDeepBtn"><i class="fa-solid fa-broom"></i> Deep Clean (folder + registry + shortcuts)</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function skeletonRow() {
  return `
    <div class="skeleton-row">
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>
  `;
}

export async function renderUninstaller() {
  const list = filtered();
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Installed Programs</h1>
        <div class="page-sub">${loading ? 'Reading Windows registry (HKLM + HKCU Uninstall keys)...' : `${programs.length} programs found${searchQuery ? ` · ${list.length} matching` : ''}`}</div>
      </div>
      <div style="display:flex; gap:8px">
        <div class="sort-dropdown">
          <button class="btn ghost" id="sortBtn"><i class="fa-solid fa-arrow-down-wide-short"></i> Sort: ${sortBy}</button>
        </div>
        <button class="btn ghost icon-btn" id="uninRefreshBtn" title="Rescan registry"><i class="fa-solid fa-arrows-rotate ${loading ? 'spin-loop' : ''}"></i></button>
      </div>
    </div>
    <div class="search-bar">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="uninSearch" placeholder="Search by name, publisher, path..." value="${escapeHtml(searchQuery)}" ${loading ? 'disabled' : ''} />
      ${searchQuery ? '<button class="search-clear" id="uninSearchClear"><i class="fa-solid fa-xmark"></i></button>' : ''}
    </div>
    ${loading ? `<div class="unin-list">${Array(8).fill(0).map(skeletonRow).join('')}</div>` : ''}
    ${!loading ? `<div class="unin-list">${list.map(programRow).join('')}</div>` : ''}
    ${!loading && !list.length ? `<div class="card" style="text-align:center; color:var(--text-dim); padding: 40px"><i class="fa-solid fa-magnifying-glass" style="font-size:24px; opacity:0.4"></i><div style="margin-top:12px">No matching programs</div></div>` : ''}
    ${detailModalHtml()}
  `;
}

async function loadList(root) {
  const res = await window.cobalt.uninstallerList();
  if (res.ok) programs = res.data;
  loading = false;
  await rerender(root);
  loadIconsAsync(root);
}

async function loadIconsAsync(root) {
  const list = filtered().slice(0, 60);
  for (const p of list) {
    if (iconCache.has(p.keyId)) continue;
    if (!p.iconPath) { iconCache.set(p.keyId, null); continue; }
    try {
      const res = await window.cobalt.uninstallerIcon(p.iconPath);
      if (res.ok && res.data) {
        iconCache.set(p.keyId, res.data);
        const row = root.querySelector(`.unin-row[data-key="${CSS.escape(p.keyId)}"] .unin-icon`);
        if (row) row.innerHTML = `<img class="unin-icon-img" src="${res.data}" alt="" />`;
      } else iconCache.set(p.keyId, null);
    } catch { iconCache.set(p.keyId, null); }
  }
}

async function openDetails(root, keyId) {
  const p = programs.find((x) => x.keyId === keyId);
  if (!p) return;
  selectedProgram = p;
  selectedDetails = null;
  await rerender(root);
  const res = await window.cobalt.uninstallerDetails(keyId);
  if (res.ok) selectedDetails = res.data;
  await rerender(root);
}

async function runUninstall(root, keyId, deep = false) {
  const p = programs.find((x) => x.keyId === keyId);
  if (!p) return;

  const decision = await confirmDialog({
    title: deep ? 'Deep clean this program?' : 'Uninstall this program?',
    body: `<b>${p.name}</b>${p.publisher ? ' by ' + p.publisher : ''}<br><br>${deep ? 'This will run the uninstaller, then <b>delete the install folder</b>, <b>purge registry keys</b> under the publisher/app name, and remove Start Menu/Desktop shortcuts.<br><br><span style="color:var(--warn)">Deep clean is aggressive and cannot be undone without a restore point.</span>' : 'The program\'s uninstaller will run.'}`,
    confirmLabel: deep ? 'Deep Clean' : 'Uninstall',
    danger: true,
    restorePoint: true,
  });
  if (!decision.confirmed) return;

  if (decision.createRestorePoint) {
    await window.cobalt.createRestorePoint(`Cobalt: before removing ${p.name}`);
  }

  opState[keyId] = { status: 'uninstalling' };
  await rerender(root);

  if (p.uninstallString) {
    const uRes = await window.cobalt.uninstallerRun(p, () => {});
    if (!uRes.ok && !deep) {
      opState[keyId] = { status: 'failed', error: uRes.error };
      await rerender(root);
      return;
    }
  }

  if (deep) {
    opState[keyId] = { status: 'deep-cleaning' };
    await rerender(root);
    const dRes = await window.cobalt.uninstallerDeepClean(p, () => {});
    if (!dRes.ok) {
      opState[keyId] = { status: 'failed', error: dRes.error };
      await rerender(root);
      return;
    }
    programs = programs.filter((x) => x.keyId !== keyId);
  } else {
    const check = await window.cobalt.uninstallerList();
    if (check.ok) programs = check.data;
  }

  opState[keyId] = { status: 'done' };
  selectedProgram = null;
  try {
    window.cobalt.notify({ title: 'Cobalt', body: `${p.name} ${deep ? 'deep-cleaned' : 'uninstalled'}.` });
  } catch {}
  await rerender(root);
}

export function bindUninstaller(root) {
  if (!loadStarted) { loadStarted = true; loadList(root); }

  const searchInput = root.querySelector('#uninSearch');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        searchQuery = searchInput.value;
        const cursor = searchInput.selectionStart;
        await rerender(root);
        const s = root.querySelector('#uninSearch');
        if (s) { s.focus(); try { s.setSelectionRange(cursor, cursor); } catch {} }
        loadIconsAsync(root);
      }, 180);
    });
  }
  const searchClear = root.querySelector('#uninSearchClear');
  if (searchClear) searchClear.addEventListener('click', () => { searchQuery = ''; rerender(root); });

  const sortBtn = root.querySelector('#sortBtn');
  if (sortBtn) sortBtn.addEventListener('click', () => {
    sortBy = sortBy === 'name' ? 'size' : sortBy === 'size' ? 'date' : 'name';
    rerender(root);
  });

  const refreshBtn = root.querySelector('#uninRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => { loading = true; iconCache.clear(); rerender(root); loadList(root); });

  root.querySelectorAll('[data-act="details"]').forEach((b) => b.addEventListener('click', () => openDetails(root, b.dataset.key)));
  root.querySelectorAll('.unin-row [data-act="uninstall"]').forEach((b) => b.addEventListener('click', () => runUninstall(root, b.dataset.key)));

  const closeModal = root.querySelector('#uninModalClose');
  if (closeModal) closeModal.addEventListener('click', () => { selectedProgram = null; rerender(root); });
  const backdrop = root.querySelector('#uninModal');
  if (backdrop) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) { selectedProgram = null; rerender(root); } });

  const runBtn = root.querySelector('#uninRunBtn');
  if (runBtn && selectedProgram) runBtn.addEventListener('click', () => runUninstall(root, selectedProgram.keyId, false));
  const deepBtn = root.querySelector('#uninDeepBtn');
  if (deepBtn && selectedProgram) deepBtn.addEventListener('click', () => runUninstall(root, selectedProgram.keyId, true));
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('uninstaller')) return;
  root.innerHTML = `<div class="page">${await renderUninstaller()}</div>`;
  bindUninstaller(root);
}
