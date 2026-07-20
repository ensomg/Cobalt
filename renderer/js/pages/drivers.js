let lastUpdates = null;
let lastCheckAt = null;
let searchQuery = '';
let isElevated = null;
let autoStarted = false;
let checkingUpdates = false;
let checkLog = [];
const installState = {};

const PAGE_SIZE = 5;
const pageState = { updates: 0, missing: 0, installed: 0 };
const openState = { updates: false, missing: false, installed: false };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isCriticalUpdate(u) {
  if (!u) return false;
  if (u.severity && /critical/i.test(u.severity)) return true;
  const t = (u.title || '') + ' ' + (u.description || '');
  return /security|critical/i.test(t);
}

function critMark(title) {
  return `<i class="fa-solid fa-circle-exclamation crit-mark" title="${escapeHtml(title || 'Critical')}"></i>`;
}

function badge(d) {
  if (!d.version) return `<div class="badge critical">Missing</div>`;
  if (d.status && d.status !== 'OK') return `<div class="badge outdated">${escapeHtml(d.status)}</div>`;
  return `<div class="badge ok">Installed</div>`;
}

function matchInstalled(update, list) {
  const t = (update.title || '').toLowerCase();
  const mfg = (update.driverMfg || '').toLowerCase();
  const cls = (update.driverClass || '').toLowerCase();

  const scored = list
    .map((d) => {
      const dName = (d.name || '').toLowerCase();
      const dVendor = (d.vendor || '').toLowerCase();
      const dCls = (d.klass || '').toLowerCase();
      let s = 0;
      if (cls && dCls && cls === dCls) s += 2;
      if (mfg && dVendor && dVendor.includes(mfg.split(' ')[0])) s += 1;
      const words = dName.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) if (t.includes(w)) s += 1;
      return { d, s };
    })
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s);

  return scored.length ? scored[0].d : null;
}

function updateRowHtml(u, matched) {
  const currentVer = matched && matched.version ? matched.version : '—';
  const newVer = u.driverVersion || '—';
  const size = u.sizeMb ? `${u.sizeMb} MB` : '';
  const crit = isCriticalUpdate(u) ? critMark('Critical / security update') : '';
  const state = installState[u.updateId] || { status: 'idle' };
  const action = renderInstallAction(u, state);
  const progress = state.status === 'downloading' || state.status === 'installing'
    ? `<div class="row-progress"><div class="row-progress-bar" style="width:${state.percent || 0}%"></div><div class="row-progress-text">${state.status === 'downloading' ? 'Downloading' : 'Installing'} ${state.percent || 0}%</div></div>`
    : '';
  return `
    <div class="driver-row update-row" data-update-id="${escapeHtml(u.updateId || '')}">
      <div class="d-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div>
      <div>
        <div class="d-name">${crit}${escapeHtml(u.title)}</div>
        <div class="d-vendor">${escapeHtml(u.driverMfg || 'Microsoft Update')}${u.kb ? ` &middot; KB${escapeHtml(u.kb)}` : ''}${size ? ` &middot; ${size}` : ''}</div>
        ${progress}
      </div>
      <div class="d-ver">
        <span style="color:var(--text-mute)">${escapeHtml(currentVer)}</span>
        <span style="color:var(--text-mute); margin: 0 6px">→</span>
        <span style="color:var(--accent); font-weight:600">${escapeHtml(newVer)}</span>
      </div>
      <div class="d-ver">${u.driverDate ? escapeHtml(u.driverDate) : (u.driverClass ? escapeHtml(u.driverClass) : '')}</div>
      ${action}
    </div>
  `;
}

function renderInstallAction(u, state) {
  switch (state.status) {
    case 'downloading':
    case 'installing':
      return `<button class="btn small" disabled><i class="fa-solid fa-spinner spin-loop"></i></button>`;
    case 'installed':
      return `<div class="badge ok">Installed</div>`;
    case 'reboot':
      return `<div class="badge outdated" title="Restart required to finish">Reboot</div>`;
    case 'failed':
      return `<button class="btn small" data-act="install" data-id="${escapeHtml(u.updateId)}" title="${escapeHtml(state.error || 'Failed')}"><i class="fa-solid fa-rotate"></i> Retry</button>`;
    default:
      return `<button class="btn primary small" data-act="install" data-id="${escapeHtml(u.updateId)}"><i class="fa-solid fa-download"></i> Install</button>`;
  }
}

function driverRowHtml(d) {
  const crit = !d.version ? critMark('Missing driver') : (d.status && d.status !== 'OK' ? critMark(`Status: ${d.status}`) : '');
  return `
    <div class="driver-row">
      <div class="d-icon"><i class="fa-solid fa-microchip"></i></div>
      <div>
        <div class="d-name">${crit}${escapeHtml(d.name)}</div>
        <div class="d-vendor">${escapeHtml(d.vendor || 'Unknown')} &middot; ${escapeHtml(d.klass)}</div>
      </div>
      <div class="d-ver">${d.version ? escapeHtml(d.version) : '<span style="color:#e08a8a">None</span>'}</div>
      <div class="d-ver">${d.date ? escapeHtml(d.date) : '-'}</div>
      ${badge(d)}
    </div>
  `;
}

function filterUpdates(list) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return list;
  return list.filter(({ u }) => (u.title || '').toLowerCase().includes(q) || (u.driverMfg || '').toLowerCase().includes(q) || (u.driverClass || '').toLowerCase().includes(q));
}

function filterDrivers(list) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return list;
  return list.filter((d) => (d.name || '').toLowerCase().includes(q) || (d.vendor || '').toLowerCase().includes(q) || (d.klass || '').toLowerCase().includes(q));
}

function stackSection({ id, title, icon, color, items, renderRow, previewTitle, previewCrit }) {
  if (!items.length) return '';
  const count = items.length;

  const header = `
    <div style="margin: 22px 0 10px; display:flex; align-items:center; gap:10px">
      <i class="${icon}" style="color:${color}"></i>
      <div style="text-transform:uppercase; letter-spacing:2px; font-size:12px; font-weight:700; color:${color}">
        ${title} (${count})
      </div>
      <div style="flex:1; height:1px; background:var(--border-dim)"></div>
    </div>
  `;

  if (count === 1) {
    return `${header}${renderRow(items[0])}`;
  }

  const isOpen = openState[id];

  if (!isOpen) {
    const previewIndicator = previewCrit ? critMark('Critical items in this stack') : '';
    return `
      ${header}
      <div class="stack-collapsed" data-stack="${id}">
        <div class="stack-card back-2"></div>
        <div class="stack-card back-1"></div>
        <div class="stack-card top">
          <div class="stack-preview">
            <div class="stack-preview-icon"><i class="${icon}" style="color:${color}"></i></div>
            <div style="flex:1; min-width:0">
              <div class="stack-preview-title">${previewIndicator}${escapeHtml(previewTitle)}</div>
              <div class="stack-preview-sub">${count} items &middot; click to expand</div>
            </div>
            <i class="fa-solid fa-chevron-down" style="color:var(--text-dim)"></i>
          </div>
        </div>
      </div>
    `;
  }

  const page = pageState[id] || 0;
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, count);
  const slice = items.slice(start, end);
  const canUp = page > 0;
  const canDown = end < count;

  return `
    ${header}
    <div class="stack-open" data-stack="${id}">
      <div class="stack-controls">
        <button class="btn ghost icon-btn stack-btn" data-dir="up" ${canUp ? '' : 'disabled'} title="Previous 5">
          <i class="fa-solid fa-chevron-up"></i>
        </button>
        <div class="stack-page-info">${start + 1}-${end} of ${count}</div>
        <button class="btn ghost icon-btn stack-btn" data-dir="down" ${canDown ? '' : 'disabled'} title="Next 5">
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div style="flex:1"></div>
        <button class="btn ghost icon-btn stack-btn" data-dir="close" title="Collapse">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="stack-items">
        ${slice.map(renderRow).join('')}
      </div>
    </div>
  `;
}

export async function renderDrivers({ getLastScan }) {
  let list = getLastScan();
  if (!list) {
    const res = await window.cobalt.scanDrivers();
    if (!res.ok) {
      return `
        <div class="page-header"><div><h1 class="page-title">Drivers</h1></div></div>
        <div class="card" style="color:#e6a2a2">Error: ${escapeHtml(res.error)}</div>
      `;
    }
    list = res.data;
  }

  const missingAll = list.filter((d) => !d.version);
  const installedAll = list.filter((d) => d.version);
  const missing = filterDrivers(missingAll);
  const installed = filterDrivers(installedAll);

  const adminBanner = (isElevated === false && lastUpdates && lastUpdates.length > 0) ? `
    <div class="admin-banner">
      <i class="fa-solid fa-shield-halved"></i>
      <div style="flex:1">
        <div style="font-weight:600">Administrator privileges required</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:2px">Installing drivers needs admin rights. Cobalt can restart with elevation.</div>
      </div>
      <button class="btn primary small" id="relaunchAdminBtn"><i class="fa-solid fa-arrow-up-right-from-square"></i> Restart as Admin</button>
    </div>
  ` : '';

  let installAllBtn = '';
  if (lastUpdates && lastUpdates.length > 1) {
    const anyRunning = lastUpdates.some((u) => {
      const s = installState[u.updateId];
      return s && (s.status === 'downloading' || s.status === 'installing');
    });
    installAllBtn = `<button class="btn primary small" id="installAllBtn" ${anyRunning ? 'disabled' : ''}><i class="fa-solid fa-cloud-arrow-down"></i> Install All (${lastUpdates.length})</button>`;
  }

  let updatesSection = '';
  if (lastUpdates) {
    if (lastUpdates.length === 0) {
      updatesSection = `
        <div class="card" style="display:flex; align-items:center; gap:14px; border-color: rgba(107, 207, 138, 0.35)">
          <div class="hw-icon" style="background: rgba(107, 207, 138, 0.15); color: var(--ok)"><i class="fa-solid fa-check"></i></div>
          <div>
            <div style="font-weight:600">All drivers are up to date</div>
            <div style="font-size:12px; color:var(--text-dim); margin-top:2px">Last checked ${escapeHtml(new Date(lastCheckAt).toLocaleTimeString())} via Windows Update</div>
          </div>
        </div>
      `;
    } else {
      const enrichedAll = lastUpdates.map((u) => ({ u, m: matchInstalled(u, list) }));
      const enriched = filterUpdates(enrichedAll);
      const hasCritical = enriched.some(({ u }) => isCriticalUpdate(u));
      updatesSection = stackSection({
        id: 'updates',
        title: 'Updates Available',
        icon: 'fa-solid fa-cloud-arrow-down',
        color: 'var(--accent)',
        items: enriched,
        renderRow: ({ u, m }) => updateRowHtml(u, m),
        previewTitle: enriched[0] ? enriched[0].u.title : (lastUpdates[0] && lastUpdates[0].title) || '',
        previewCrit: hasCritical,
      });
    }
  }

  const missingSection = stackSection({
    id: 'missing',
    title: 'Missing Drivers',
    icon: 'fa-solid fa-triangle-exclamation',
    color: '#e08a8a',
    items: missing,
    renderRow: driverRowHtml,
    previewTitle: missing[0] ? missing[0].name : '',
    previewCrit: missing.length > 0,
  });

  const installedSection = stackSection({
    id: 'installed',
    title: 'Installed Drivers',
    icon: 'fa-solid fa-check',
    color: 'var(--text-dim)',
    items: installed,
    renderRow: driverRowHtml,
    previewTitle: installed[0] ? installed[0].name : '',
    previewCrit: installed.some((d) => d.status && d.status !== 'OK'),
  });

  const empty = !updatesSection && !missingSection && !installedSection && searchQuery
    ? `<div class="card" style="text-align:center; color:var(--text-dim)">No matches for "${escapeHtml(searchQuery)}"</div>`
    : '';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Driver Management</h1>
        <div class="page-sub">Phase 2: Update check via Windows Update</div>
      </div>
      <button class="btn primary" id="checkUpdatesBtn">
        <i class="fa-solid fa-cloud-arrow-down"></i> Check for Updates
      </button>
    </div>

    <div class="search-bar">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="searchInput" placeholder="Search drivers, vendors, classes..." value="${escapeHtml(searchQuery)}" />
      ${searchQuery ? '<button class="search-clear" id="searchClear" title="Clear"><i class="fa-solid fa-xmark"></i></button>' : ''}
    </div>

    <div id="updateStatus" style="display:none; margin-bottom: 14px; padding: 12px 16px; background: var(--bg-1); border: 1px solid var(--border-dim); border-radius: 8px; color: var(--text-dim); font-size: 12px; align-items:center; gap:10px">
      <i class="fa-solid fa-spinner spin-loop"></i>
      <span id="updateStatusText">Contacting Windows Update...</span>
    </div>
    ${adminBanner}
    ${installAllBtn ? `<div style="display:flex; justify-content:flex-end; margin-bottom: 6px">${installAllBtn}</div>` : ''}
    ${updatesSection}
    ${missingSection}
    ${installedSection}
    ${empty}
    ${checkModal()}
  `;
}

export function bindDrivers(root) {
  const btn = root.querySelector('#checkUpdatesBtn');
  const status = root.querySelector('#updateStatus');
  const statusText = root.querySelector('#updateStatusText');
  const searchInput = root.querySelector('#searchInput');
  const searchClear = root.querySelector('#searchClear');
  const installAllBtn = root.querySelector('#installAllBtn');
  const relaunchBtn = root.querySelector('#relaunchAdminBtn');

  if (isElevated === null) {
    window.cobalt.isElevated().then((v) => {
      isElevated = v;
      if (!v) {
        import('../ui/toast.js').then(({ toast }) => toast({
          title: 'Administrator required',
          body: 'Driver updates need admin. Click "Restart as Admin" or right-click Cobalt.exe → Run as administrator.',
          kind: 'warn',
          duration: 8000,
        }));
      }
      if (lastUpdates && lastUpdates.length > 0) rerender(root);
    });
  }

  if (!autoStarted && lastUpdates === null && !checkingUpdates) {
    autoStarted = true;
    setTimeout(() => runCheckUpdates(root), 400);
  }

  if (relaunchBtn) {
    relaunchBtn.addEventListener('click', () => window.cobalt.relaunchAsAdmin());
  }

  if (installAllBtn) {
    installAllBtn.addEventListener('click', () => runInstall(root, lastUpdates.map((u) => u.updateId)));
  }

  root.querySelectorAll('[data-act="install"]').forEach((b) => {
    b.addEventListener('click', () => runInstall(root, [b.dataset.id]));
  });

  if (btn) {
    btn.addEventListener('click', () => runCheckUpdates(root));
  }

  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = searchInput.value;
        pageState.updates = 0; pageState.missing = 0; pageState.installed = 0;
        if (searchQuery.trim()) {
          openState.updates = openState.missing = openState.installed = true;
        }
        const cursor = searchInput.selectionStart;
        rerenderKeepFocus(root, cursor);
      }, 180);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchQuery = '';
      rerender(root);
    });
  }

  root.querySelectorAll('.stack-collapsed').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.stack;
      openState[id] = true;
      pageState[id] = 0;
      rerender(root);
    });
  });

  root.querySelectorAll('.stack-open .stack-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.closest('.stack-open').dataset.stack;
      const dir = btn.dataset.dir;
      if (dir === 'close') {
        openState[id] = false;
      } else if (dir === 'up') {
        pageState[id] = Math.max(0, (pageState[id] || 0) - 1);
      } else if (dir === 'down') {
        pageState[id] = (pageState[id] || 0) + 1;
      }
      rerender(root);
    });
  });
}

async function runCheckUpdates(root) {
  if (checkingUpdates) return;
  checkingUpdates = true;
  checkLog = [{ status: 'info', text: 'Contacting Windows Update Agent...' }];
  await rerender(root);
  const t0 = Date.now();
  checkLog.push({ status: 'info', text: 'Registering Microsoft Update service (if needed)...' });
  await rerender(root);
  checkLog.push({ status: 'info', text: "Running search: IsInstalled=0 and Type='Driver' and IsHidden=0" });
  await rerender(root);

  const res = await window.cobalt.checkUpdates();
  const ms = Date.now() - t0;

  if (!res.ok) {
    checkLog.push({ status: 'fail', text: `Failed: ${res.error}` });
    checkingUpdates = false;
    try { window.cobalt.notify({ title: 'Cobalt: Update check failed', body: res.error }); } catch {}
    await rerender(root);
    return;
  }

  lastUpdates = res.data.updates || [];
  lastCheckAt = Date.now();
  pageState.updates = 0;
  openState.updates = lastUpdates.length > 0;
  checkLog.push({ status: 'ok', text: `✓ Check complete in ${(ms / 1000).toFixed(1)}s` });
  checkLog.push({ status: lastUpdates.length ? 'ok' : 'info', text: `  ${lastUpdates.length} driver update${lastUpdates.length === 1 ? '' : 's'} available` });
  await rerender(root);
  await new Promise((r) => setTimeout(r, 700));
  checkingUpdates = false;
  try {
    window.cobalt.notify({
      title: 'Cobalt: Driver check done',
      body: lastUpdates.length ? `${lastUpdates.length} update${lastUpdates.length === 1 ? '' : 's'} available.` : 'All drivers are up to date.',
    });
  } catch {}
  await rerender(root);
}

function checkModal() {
  if (!checkingUpdates) return '';
  const lines = checkLog.slice(-30).map((l) =>
    `<div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:${l.status === 'ok' ? 'var(--ok)' : l.status === 'fail' ? 'var(--crit)' : 'var(--text-dim)'}">${escapeHtml(l.text)}</div>`
  ).join('');
  return `
    <div class="modal-backdrop">
      <div class="modal" style="width: min(560px, 92vw)">
        <div class="modal-head">
          <div class="hw-icon"><i class="fa-solid fa-cloud-arrow-down spin-loop" style="color:var(--accent)"></i></div>
          <div style="flex:1">
            <div class="modal-title">Checking for driver updates</div>
            <div class="modal-sub">Windows Update Agent search (30-90s typical)</div>
          </div>
        </div>
        <div class="modal-body" style="background: var(--bg-0); max-height: 320px; overflow-y: auto">${lines}</div>
      </div>
    </div>
  `;
}

async function runInstall(root, ids) {
  if (!ids || !ids.length) return;
  ids.forEach((id) => { installState[id] = { status: 'downloading', percent: 0 }; });
  await rerender(root);

  const res = await window.cobalt.installUpdates(ids, (ev) => {
    if (ev.type === 'phase') {
      const phase = ev.payload.phase;
      const status = phase === 'install' ? 'installing' : (phase === 'download' ? 'downloading' : null);
      if (status) {
        ids.forEach((id) => { installState[id] = { ...(installState[id] || {}), status, percent: 0 }; });
        updateRowsFromState(root);
      }
    } else if (ev.type === 'progress') {
      const status = ev.payload.phase === 'install' ? 'installing' : 'downloading';
      const percent = ev.payload.percent || 0;
      ids.forEach((id) => { installState[id] = { ...(installState[id] || {}), status, percent }; });
      updateRowsFromState(root);
    } else if (ev.type === 'done') {
      const results = ev.payload.updates || [];
      results.forEach((r) => {
        let s;
        if (r.resultCode === 2 && r.rebootRequired) s = { status: 'reboot' };
        else if (r.resultCode === 2) s = { status: 'installed' };
        else s = { status: 'failed', error: `HRESULT 0x${(r.hresult >>> 0).toString(16)}` };
        installState[r.updateId] = s;
      });
    }
  });

  if (!res.ok) {
    ids.forEach((id) => { installState[id] = { status: 'failed', error: res.error }; });
    if (res.code === 'not-admin') isElevated = false;
    try { window.cobalt.notify({ title: 'Cobalt: Driver install failed', body: res.error }); } catch {}
  } else {
    const okCount = Object.values(installState).filter((s) => s.status === 'installed' || s.status === 'reboot').length;
    const reboot = Object.values(installState).some((s) => s.status === 'reboot');
    try {
      window.cobalt.notify({
        title: 'Cobalt: Driver install done',
        body: `${okCount} update${okCount === 1 ? '' : 's'} installed${reboot ? '. Reboot required.' : '.'}`,
      });
    } catch {}
  }

  await rerender(root);
}

function updateRowsFromState(root) {
  Object.keys(installState).forEach((id) => {
    const state = installState[id];
    const row = root.querySelector(`.update-row[data-update-id="${id}"]`);
    if (!row) return;
    let prog = row.querySelector('.row-progress');
    const showProg = state.status === 'downloading' || state.status === 'installing';
    if (showProg) {
      if (!prog) {
        const container = row.children[1];
        container.insertAdjacentHTML('beforeend', `<div class="row-progress"><div class="row-progress-bar"></div><div class="row-progress-text"></div></div>`);
        prog = row.querySelector('.row-progress');
      }
      prog.querySelector('.row-progress-bar').style.width = (state.percent || 0) + '%';
      prog.querySelector('.row-progress-text').textContent = `${state.status === 'downloading' ? 'Downloading' : 'Installing'} ${state.percent || 0}%`;
    }
  });
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('drivers')) return;
  const { getLastScan } = await import('./scan.js');
  root.innerHTML = `<div class="page">${await renderDrivers({ getLastScan })}</div>`;
  bindDrivers(root);
}

async function rerenderKeepFocus(root, cursor) {
  await rerender(root);
  const input = root.querySelector('#searchInput');
  if (input) {
    input.focus();
    try { input.setSelectionRange(cursor, cursor); } catch {}
  }
}
