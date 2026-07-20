import { APP_CATALOG, APP_CATEGORIES } from '../mock/apps.js';

let activeCat = 'all';
let searchQuery = '';
let installed = {};
let upgrades = {};
let wingetReady = null;
let wingetVersion = '';
let statusLoaded = false;
let statusLoading = false;
const opState = {};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function filterApps() {
  const q = searchQuery.trim().toLowerCase();
  return APP_CATALOG.filter((a) => {
    if (activeCat !== 'all' && a.category !== activeCat) return false;
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
  });
}

function actionButton(a) {
  const op = opState[a.id];
  if (op && op.status === 'running') {
    return `<button class="btn small" disabled><i class="fa-solid fa-spinner spin-loop"></i> ${escapeHtml(op.label || 'Working')} ${op.percent != null ? op.percent + '%' : ''}</button>`;
  }
  if (op && op.status === 'failed') {
    return `<button class="btn small" data-act="retry" data-id="${escapeHtml(a.id)}" title="${escapeHtml(op.error || '')}"><i class="fa-solid fa-rotate"></i> Retry</button>`;
  }
  if (op && op.status === 'success') {
    return `<button class="btn small" data-act="uninstall" data-id="${escapeHtml(a.id)}"><i class="fa-solid fa-check"></i> Done</button>`;
  }
  if (upgrades[a.id]) {
    return `
      <div style="display:flex; gap:6px">
        <button class="btn primary small" data-act="upgrade" data-id="${escapeHtml(a.id)}"><i class="fa-solid fa-arrow-up"></i> Update</button>
        <button class="btn ghost small" data-act="uninstall" data-id="${escapeHtml(a.id)}" title="Uninstall"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }
  if (installed[a.id]) {
    return `<button class="btn ghost small" data-act="uninstall" data-id="${escapeHtml(a.id)}"><i class="fa-solid fa-trash"></i> Uninstall</button>`;
  }
  return `<button class="btn primary small" data-act="install" data-id="${escapeHtml(a.id)}"><i class="fa-solid fa-cloud-arrow-down"></i> Install</button>`;
}

function statusBadge(a) {
  if (upgrades[a.id]) return '<span class="tag accent" style="margin-left:6px">Update</span>';
  if (installed[a.id]) return '<span class="tag muted" style="margin-left:6px">Installed</span>';
  return '';
}

function progressBar(a) {
  const op = opState[a.id];
  if (!op || op.status !== 'running') return '';
  return `<div class="row-progress" style="margin-top:0"><div class="row-progress-bar" style="width:${op.percent || 0}%"></div></div>`;
}

function appCard(a) {
  return `
    <div class="card app-card" data-id="${escapeHtml(a.id)}">
      <div class="app-head">
        <div class="app-icon" style="background:${a.color}"><i class="fa-${a.family} ${a.icon}"></i></div>
        <div style="flex:1; min-width:0">
          <div class="app-name">${escapeHtml(a.name)}${statusBadge(a)}</div>
          <div style="font-size:11px; color:var(--text-dim); font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${escapeHtml(a.id)}</div>
        </div>
      </div>
      <div class="app-desc">${escapeHtml(a.desc)}</div>
      ${progressBar(a)}
      <div>${actionButton(a)}</div>
    </div>
  `;
}

export async function renderApps() {
  const chips = APP_CATEGORIES.map((c) => `
    <div class="chip ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}">
      <i class="fa-solid ${c.icon}"></i> ${c.name}
    </div>
  `).join('');

  const wingetBanner = wingetReady === false ? `
    <div class="admin-banner">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div style="flex:1">
        <div style="font-weight:600">Windows Package Manager (winget) not found</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:2px">Install "App Installer" from the Microsoft Store to enable Apps.</div>
      </div>
    </div>
  ` : '';

  const wingetTag = wingetReady ? `<span class="tag muted" style="margin-left:8px">winget ${escapeHtml(wingetVersion)}</span>` : '';

  const list = filterApps();
  const upgradesCount = Object.values(upgrades).filter(Boolean).length;
  const upgradeAllBtn = upgradesCount > 1 ? `<button class="btn primary" id="upgradeAllBtn"><i class="fa-solid fa-arrow-up"></i> Update All (${upgradesCount})</button>` : '';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">App Library ${wingetTag}</h1>
        <div class="page-sub">Install popular programs with one click via winget</div>
      </div>
      <div style="display:flex; gap:8px">
        ${upgradeAllBtn}
        <button class="btn ghost icon-btn" id="refreshAppsBtn" title="Refresh" ${statusLoading ? 'disabled' : ''}>
          <i class="fa-solid fa-arrows-rotate ${statusLoading ? 'spin-loop' : ''}"></i>
        </button>
      </div>
    </div>
    ${wingetBanner}
    <div class="search-bar">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="appSearchInput" placeholder="Search apps by name or package ID..." value="${escapeHtml(searchQuery)}" />
      ${searchQuery ? '<button class="search-clear" id="appSearchClear"><i class="fa-solid fa-xmark"></i></button>' : ''}
    </div>
    <div class="category-bar" id="cats">${chips}</div>
    ${statusLoading && !statusLoaded ? '<div class="card" style="display:flex; gap:10px; align-items:center; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading installed apps via winget...</div>' : ''}
    <div class="grid grid-3" id="appGrid">${list.map(appCard).join('')}</div>
  `;
}

async function loadWingetStatus(root) {
  if (statusLoading) return;
  statusLoading = true;
  await rerender(root);

  if (wingetReady === null) {
    const res = await window.cobalt.wingetCheck();
    wingetReady = !!(res.ok && res.data.ok);
    wingetVersion = res.ok && res.data.ok ? res.data.version : '';
  }
  if (!wingetReady) { statusLoading = false; statusLoaded = true; await rerender(root); return; }

  const ids = APP_CATALOG.map((a) => a.id);
  const listRes = await window.cobalt.wingetList(ids);
  if (listRes.ok) installed = listRes.data;

  const upRes = await window.cobalt.wingetUpgrades(ids);
  if (upRes.ok) upgrades = upRes.data;

  statusLoading = false;
  statusLoaded = true;
  await rerender(root);
}

async function runOp(root, id, kind) {
  const app = APP_CATALOG.find((a) => a.id === id);
  const label = kind === 'install' ? 'Installing' : kind === 'uninstall' ? 'Uninstalling' : 'Updating';
  opState[id] = { status: 'running', percent: 0, label };
  await rerender(root);

  const onProgress = (ev) => {
    if (ev.type === 'progress') {
      opState[id] = { ...(opState[id] || {}), status: 'running', percent: ev.percent, label };
      updateOpRow(root, id);
    } else if (ev.type === 'phase') {
      opState[id] = { ...(opState[id] || {}), status: 'running', label: ev.phase === 'download' ? 'Downloading' : ev.phase === 'install' ? 'Installing' : ev.phase === 'uninstall' ? 'Uninstalling' : label };
      updateOpRow(root, id);
    }
  };

  const fn = kind === 'install' ? window.cobalt.wingetInstall : kind === 'uninstall' ? window.cobalt.wingetUninstall : window.cobalt.wingetUpgrade;
  const res = await fn(id, onProgress);

  if (res.ok) {
    if (kind === 'install' || kind === 'upgrade') { installed[id] = true; upgrades[id] = false; }
    else if (kind === 'uninstall') { installed[id] = false; upgrades[id] = false; }
    delete opState[id];
  } else {
    opState[id] = { status: 'failed', error: res.error };
  }
  await rerender(root);
}

function updateOpRow(root, id) {
  const card = root.querySelector(`.app-card[data-id="${id}"]`);
  if (!card) return;
  const bar = card.querySelector('.row-progress-bar');
  const op = opState[id];
  if (!op || op.status !== 'running') return;
  if (bar) bar.style.width = (op.percent || 0) + '%';
  const btn = card.querySelector('button[disabled]');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner spin-loop"></i> ${op.label || 'Working'} ${op.percent != null ? op.percent + '%' : ''}`;
}

export function bindApps(root) {
  if (!statusLoaded && !statusLoading) loadWingetStatus(root);

  const cats = root.querySelector('#cats');
  const grid = root.querySelector('#appGrid');
  if (cats) {
    cats.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      activeCat = chip.dataset.cat;
      rerender(root);
    });
  }

  const search = root.querySelector('#appSearchInput');
  if (search) {
    let debounce;
    search.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        searchQuery = search.value;
        const cursor = search.selectionStart;
        await rerender(root);
        const s = root.querySelector('#appSearchInput');
        if (s) { s.focus(); try { s.setSelectionRange(cursor, cursor); } catch {} }
      }, 180);
    });
  }

  const searchClear = root.querySelector('#appSearchClear');
  if (searchClear) searchClear.addEventListener('click', () => { searchQuery = ''; rerender(root); });

  const refreshBtn = root.querySelector('#refreshAppsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => { statusLoaded = false; loadWingetStatus(root); });

  const upgradeAllBtn = root.querySelector('#upgradeAllBtn');
  if (upgradeAllBtn) {
    upgradeAllBtn.addEventListener('click', async () => {
      for (const id of Object.keys(upgrades)) {
        if (upgrades[id]) await runOp(root, id, 'upgrade');
      }
    });
  }

  root.querySelectorAll('.app-card [data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === 'retry') {
        const wasInstalled = installed[id];
        delete opState[id];
        runOp(root, id, wasInstalled ? 'upgrade' : 'install');
      } else {
        runOp(root, id, act);
      }
    });
  });
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('apps')) return;
  root.innerHTML = `<div class="page">${await renderApps()}</div>`;
  bindApps(root);
}
