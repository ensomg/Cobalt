import { confirmDialog } from '../ui/confirm.js';

let tweaks = [];
let presets = [];
let apps = [];
let status = { tweaks: {}, installedApps: [] };
let loading = true;
let appsLoading = false;
let initialLoadStarted = false;
let selectedTweaks = new Set();
let selectedApps = new Set();
let busy = false;
let lastResult = null;
let activeTab = 'tweaks';
let startupItems = null;
let servicesItems = null;
let repairLog = '';
let repairBusy = false;

const CATEGORIES = {
  privacy:  { label: 'Privacy',      icon: 'fa-shield-halved' },
  ai:       { label: 'AI & Search',  icon: 'fa-brain' },
  ui:       { label: 'UI Tweaks',    icon: 'fa-palette' },
  explorer: { label: 'Explorer',     icon: 'fa-folder-open' },
  perf:     { label: 'Performance',  icon: 'fa-gauge-high' },
  net:      { label: 'Network',      icon: 'fa-network-wired' },
};

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isAppInstalled(name) { return status.installedApps.includes(name); }

function tweakItemHtml(t) {
  const on = !!status.tweaks[t.id];
  const checked = selectedTweaks.has(t.id);
  const risk = t.risk === 'warn'
    ? '<span class="tag" style="background:rgba(230,199,106,0.15); color:var(--warn); margin-left:8px">Caution</span>'
    : '';
  return `
    <label class="opt-item ${on ? 'opt-on' : ''}" data-tweak="${t.id}">
      <input type="checkbox" ${checked ? 'checked' : ''} data-tweak-cb="${t.id}" />
      <div class="opt-body">
        <div class="opt-title">
          ${escapeHtml(t.title)}
          ${on ? '<span class="tag muted" style="margin-left:8px"><i class="fa-solid fa-check"></i> Applied</span>' : ''}
          ${risk}
        </div>
        <div class="opt-desc">${escapeHtml(t.desc)}</div>
      </div>
    </label>
  `;
}

function presetTab() {
  return `
    <div class="preset-grid">
      ${presets.map((p) => `
        <div class="preset-card ${p.risk === 'warn' ? 'preset-warn' : ''}" data-preset="${p.id}">
          <div class="preset-icon"><i class="fa-solid ${p.icon}"></i></div>
          <div class="preset-name">${escapeHtml(p.name)}</div>
          <div class="preset-desc">${escapeHtml(p.desc)}</div>
          ${p.risk === 'warn' ? '<div class="tag" style="background:rgba(230,199,106,0.15); color:var(--warn); margin: 4px 0">Caution</div>' : ''}
          <div style="font-size:11px; color:var(--text-mute); margin: 6px 0">${p.tweakIds.length} tweaks</div>
          <button class="btn primary small preset-apply-btn" data-preset="${p.id}">Select</button>
        </div>
      `).join('')}
    </div>
    <div class="card" style="margin-top: 18px; font-size: 12px; color: var(--text-dim)">
      <b style="color:var(--text)">How presets work:</b> Clicking a preset checks all its tweaks in the Tweaks tab. Review, then hit "Apply" up top.
      Presets are non-destructive; individual tweaks can be reverted.
    </div>
  `;
}

function appItemHtml(a) {
  const installed = isAppInstalled(a.name);
  const checked = selectedApps.has(a.name);
  return `
    <label class="opt-item ${!installed ? 'opt-disabled' : ''}" data-app="${a.name}">
      <input type="checkbox" ${checked ? 'checked' : ''} ${!installed ? 'disabled' : ''} data-app-cb="${a.name}" />
      <div class="opt-body">
        <div class="opt-title">
          ${escapeHtml(a.label)}
          ${!installed ? '<span class="tag muted" style="margin-left:8px">Not installed</span>' : ''}
        </div>
        <div class="opt-desc" style="font-family: 'JetBrains Mono', monospace; font-size: 11px">${escapeHtml(a.name)}</div>
      </div>
    </label>
  `;
}

function categorySection(catId) {
  const meta = CATEGORIES[catId];
  const items = tweaks.filter((t) => t.category === catId);
  if (!items.length) return '';
  const onCount = items.filter((t) => status.tweaks[t.id]).length;
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid ${meta.icon}" style="color:var(--accent)"></i>
        <div class="opt-section-title">${meta.label}</div>
        <div class="opt-section-count">${onCount}/${items.length} applied</div>
        <button class="btn ghost small opt-select-all" data-cat="${catId}"><i class="fa-solid fa-check-double"></i> All</button>
      </div>
      <div class="opt-grid">${items.map(tweakItemHtml).join('')}</div>
    </div>
  `;
}

function tweaksTab() {
  return Object.keys(CATEGORIES).map(categorySection).join('');
}

function bloatTab() {
  const installedCount = apps.filter((a) => isAppInstalled(a.name)).length;
  const loadingBadge = appsLoading ? '<span class="tag muted" style="margin-left:8px"><i class="fa-solid fa-spinner spin-loop"></i> scanning</span>' : '';
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-trash-can" style="color:var(--crit)"></i>
        <div class="opt-section-title">Bloatware Uninstaller ${loadingBadge}</div>
        <div class="opt-section-count">${installedCount} installed of ${apps.length}</div>
        <button class="btn ghost small opt-select-installed" ${appsLoading ? 'disabled' : ''}><i class="fa-solid fa-check-double"></i> All installed</button>
      </div>
      <div class="opt-grid">${apps.map(appItemHtml).join('')}</div>
    </div>
  `;
}

function startupTab() {
  if (!startupItems) return `<div class="card" style="display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading startup entries...</div>`;
  if (!startupItems.length) return `<div class="card" style="text-align:center; color:var(--text-dim)">No startup entries found</div>`;
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-power-off" style="color:var(--accent)"></i>
        <div class="opt-section-title">Startup Entries</div>
        <div class="opt-section-count">${startupItems.length} items · ${startupItems.filter((s) => s.enabled).length} enabled</div>
      </div>
      <div class="unin-list">
        ${startupItems.map((s) => `
          <div class="unin-row">
            <div class="unin-icon-fb"><i class="fa-solid ${s.enabled ? 'fa-play' : 'fa-pause'}"></i></div>
            <div style="flex:1; min-width:0">
              <div class="unin-name">${escapeHtml(s.name)} <span class="tag muted" style="margin-left:6px">${s.scope}</span></div>
              <div class="unin-path"><i class="fa-solid fa-terminal"></i> ${escapeHtml(s.command)}</div>
            </div>
            <div class="unin-actions">
              <button class="btn ${s.enabled ? 'ghost' : 'primary'} small" data-startup-toggle data-name="${escapeHtml(s.name)}" data-enabled="${s.enabled}">${s.enabled ? '<i class="fa-solid fa-pause"></i> Disable' : '<i class="fa-solid fa-play"></i> Enable'}</button>
              <button class="btn ghost small" data-startup-remove data-name="${escapeHtml(s.name)}"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function servicesTab() {
  if (!servicesItems) return `<div class="card" style="display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading services...</div>`;
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-gears" style="color:var(--accent)"></i>
        <div class="opt-section-title">Optional Services</div>
        <div class="opt-section-count">${servicesItems.length} tracked</div>
      </div>
      <div class="unin-list">
        ${servicesItems.map((s) => `
          <div class="unin-row">
            <div class="unin-icon-fb"><i class="fa-solid fa-gear"></i></div>
            <div style="flex:1; min-width:0">
              <div class="unin-name">${escapeHtml(s.title)} <span class="tag muted" style="margin-left:6px">${escapeHtml(s.startType)}</span></div>
              <div class="unin-meta"><span>${escapeHtml(s.name)}</span><span class="dot"></span><span>Status: ${escapeHtml(s.status)}</span>${s.suggested ? `<span class="dot"></span><span>Suggested: <b style="color:var(--accent)">${escapeHtml(s.suggested)}</b></span>` : ''}</div>
            </div>
            <div class="unin-actions">
              <button class="btn ghost small" data-svc-set data-name="${escapeHtml(s.name)}" data-mode="Automatic">Auto</button>
              <button class="btn ghost small" data-svc-set data-name="${escapeHtml(s.name)}" data-mode="Manual">Manual</button>
              <button class="btn ghost small" data-svc-set data-name="${escapeHtml(s.name)}" data-mode="Disabled">Disable</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function repairTab() {
  const tools = [
    { id: 'sfc',      title: 'System File Checker',  desc: 'Scans and repairs corrupt Windows system files.',    icon: 'fa-shield-halved' },
    { id: 'dism',     title: 'DISM RestoreHealth',   desc: 'Restores Windows component store health from WU.',   icon: 'fa-hammer' },
    { id: 'dns',      title: 'Flush DNS',            desc: 'Clear DNS resolver cache.',                          icon: 'fa-network-wired' },
    { id: 'netreset', title: 'Reset Winsock/TCP',    desc: 'Reset Winsock catalog and TCP/IP stack.',            icon: 'fa-wifi' },
    { id: 'chkdsk',   title: 'Check Disk',           desc: 'Schedule a chkdsk scan on next boot.',               icon: 'fa-hard-drive' },
  ];
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-toolbox" style="color:var(--accent)"></i>
        <div class="opt-section-title">Auto-Repair Tools</div>
        <div class="opt-section-count">${tools.length} available</div>
      </div>
      <div class="opt-grid">
        ${tools.map((t) => `
          <div class="opt-item">
            <div class="unin-icon-fb"><i class="fa-solid ${t.icon}"></i></div>
            <div class="opt-body">
              <div class="opt-title">${t.title}</div>
              <div class="opt-desc">${t.desc}</div>
            </div>
            <button class="btn primary small" data-repair="${t.id}" ${repairBusy ? 'disabled' : ''}><i class="fa-solid fa-play"></i> Run</button>
          </div>
        `).join('')}
      </div>
      ${repairLog ? `<div style="margin-top:12px; padding:12px; background:var(--bg-0); border:1px solid var(--border-dim); border-radius:8px; font-family: 'JetBrains Mono', monospace; font-size:11px; max-height:280px; overflow-y:auto; white-space:pre-wrap">${escapeHtml(repairLog)}</div>` : ''}
    </div>
  `;
}

function summaryHtml() {
  if (!lastResult) return '';
  const parts = [];
  if (lastResult.appliedCount != null) parts.push(`<span style="color:var(--ok)">${lastResult.appliedCount} tweaks applied</span>`);
  if (lastResult.removedCount != null) parts.push(`<span style="color:var(--ok)">${lastResult.removedCount} apps removed</span>`);
  if (lastResult.failedCount) parts.push(`<span style="color:var(--crit)">${lastResult.failedCount} failed</span>`);
  return `
    <div class="card" style="display:flex; align-items:center; gap:12px; margin-bottom:14px; border-color: rgba(107, 207, 138, 0.35)">
      <i class="fa-solid fa-circle-check" style="color:var(--ok); font-size:18px"></i>
      <div style="flex:1">${parts.join(' &middot; ')}</div>
      <button class="btn ghost small" id="clearResult"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `;
}

export async function renderOptimize() {
  if (loading) {
    return `
      <div class="page-header"><div><h1 class="page-title">PC Optimization</h1><div class="page-sub">Loading tweaks...</div></div></div>
      <div class="card" style="text-align:center; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading system state...</div>
    `;
  }

  const totalSelected = selectedTweaks.size + selectedApps.size;
  const tabs = [
    { id: 'presets', label: 'Presets',   icon: 'fa-wand-magic-sparkles' },
    { id: 'tweaks',  label: 'Tweaks',    icon: 'fa-sliders' },
    { id: 'bloat',   label: 'Bloatware', icon: 'fa-trash-can' },
    { id: 'startup', label: 'Startup',   icon: 'fa-power-off' },
    { id: 'services',label: 'Services',  icon: 'fa-gears' },
    { id: 'repair',  label: 'Repair',    icon: 'fa-toolbox' },
  ];

  const showActions = activeTab === 'tweaks' || activeTab === 'bloat';
  const activePreset = activeTab === 'presets';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">PC Optimization</h1>
        <div class="page-sub">Debloat, privacy, startup & repair — based on Win11Debloat and community best practices</div>
      </div>
      ${showActions ? `
        <div style="display:flex; gap:8px">
          <button class="btn ghost" id="revertBtn" ${selectedTweaks.size === 0 || busy ? 'disabled' : ''}>
            <i class="fa-solid fa-rotate-left"></i> Revert
          </button>
          <button class="btn primary" id="applyBtn" ${totalSelected === 0 || busy ? 'disabled' : ''}>
            <i class="fa-solid fa-play"></i> Apply (${totalSelected})
          </button>
        </div>
      ` : ''}
    </div>
    <div class="settings-tabs">${tabs.map((t) => `<div class="tab ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i> ${t.label}</div>`).join('')}</div>
    ${summaryHtml()}
    ${busy ? `<div class="card" style="display:flex; align-items:center; gap:10px; margin-bottom: 14px"><i class="fa-solid fa-spinner spin-loop"></i> Working...</div>` : ''}
    ${activeTab === 'presets' ? presetTab() : ''}
    ${activeTab === 'tweaks' ? tweaksTab() : ''}
    ${activeTab === 'bloat' ? bloatTab() : ''}
    ${activeTab === 'startup' ? startupTab() : ''}
    ${activeTab === 'services' ? servicesTab() : ''}
    ${activeTab === 'repair' ? repairTab() : ''}
  `;
}

async function loadStatus(root) {
  try {
    const [listRes, tweakRes] = await Promise.all([
      window.cobalt.optimizeList(),
      window.cobalt.optimizeTweakStatus(),
    ]);
    if (listRes.ok) { tweaks = listRes.data.tweaks; apps = listRes.data.apps; presets = listRes.data.presets || []; }
    if (tweakRes.ok) { status = { ...status, tweaks: tweakRes.data }; }
  } catch (e) { console.error(e); }
  loading = false;
  appsLoading = true;
  await rerender(root);
  try {
    const res = await window.cobalt.optimizeAppsStatus();
    if (res.ok) status = { ...status, installedApps: res.data };
  } catch (e) { console.error(e); }
  appsLoading = false;
  await rerender(root);
}

async function loadStartup(root) {
  const res = await window.cobalt.optimizeStartupList();
  startupItems = res.ok ? res.data : [];
  await rerender(root);
}

async function loadServices(root) {
  const res = await window.cobalt.optimizeServicesList();
  servicesItems = res.ok ? res.data : [];
  await rerender(root);
}

export function bindOptimize(root) {
  if (!tweaks.length && !initialLoadStarted) {
    initialLoadStarted = true;
    loadStatus(root);
    return;
  }

  if (activeTab === 'startup' && startupItems === null) { loadStartup(root); return; }
  if (activeTab === 'services' && servicesItems === null) { loadServices(root); return; }

  root.querySelectorAll('.settings-tabs .tab').forEach((t) => t.addEventListener('click', () => {
    activeTab = t.dataset.tab;
    rerender(root);
  }));

  root.querySelectorAll('[data-tweak-cb]').forEach((cb) => cb.addEventListener('change', () => {
    const id = cb.dataset.tweakCb;
    if (cb.checked) selectedTweaks.add(id); else selectedTweaks.delete(id);
    updateButtons(root);
  }));
  root.querySelectorAll('[data-app-cb]').forEach((cb) => cb.addEventListener('change', () => {
    const id = cb.dataset.appCb;
    if (cb.checked) selectedApps.add(id); else selectedApps.delete(id);
    updateButtons(root);
  }));
  root.querySelectorAll('.opt-select-all').forEach((b) => b.addEventListener('click', () => {
    const cat = b.dataset.cat;
    const items = tweaks.filter((t) => t.category === cat);
    const allSel = items.every((t) => selectedTweaks.has(t.id));
    items.forEach((t) => allSel ? selectedTweaks.delete(t.id) : selectedTweaks.add(t.id));
    rerender(root);
  }));
  const selectInstalled = root.querySelector('.opt-select-installed');
  if (selectInstalled) selectInstalled.addEventListener('click', () => {
    const installedList = apps.filter((a) => isAppInstalled(a.name));
    const allSel = installedList.every((a) => selectedApps.has(a.name));
    installedList.forEach((a) => allSel ? selectedApps.delete(a.name) : selectedApps.add(a.name));
    rerender(root);
  });

  const applyBtn = root.querySelector('#applyBtn');
  if (applyBtn) applyBtn.addEventListener('click', () => runApply(root, 'apply'));
  const revertBtn = root.querySelector('#revertBtn');
  if (revertBtn) revertBtn.addEventListener('click', () => runApply(root, 'revert'));
  const clearBtn = root.querySelector('#clearResult');
  if (clearBtn) clearBtn.addEventListener('click', () => { lastResult = null; rerender(root); });

  root.querySelectorAll('[data-startup-toggle]').forEach((b) => b.addEventListener('click', async () => {
    const item = startupItems.find((s) => s.name === b.dataset.name);
    if (!item) return;
    b.disabled = true;
    await window.cobalt.optimizeStartupToggle(item, !item.enabled);
    startupItems = null; loadStartup(root);
  }));
  root.querySelectorAll('[data-startup-remove]').forEach((b) => b.addEventListener('click', async () => {
    const item = startupItems.find((s) => s.name === b.dataset.name);
    if (!item) return;
    b.disabled = true;
    await window.cobalt.optimizeStartupRemove(item);
    startupItems = null; loadStartup(root);
  }));

  root.querySelectorAll('[data-svc-set]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    await window.cobalt.optimizeServiceStart(b.dataset.name, b.dataset.mode);
    servicesItems = null; loadServices(root);
  }));

  root.querySelectorAll('.preset-apply-btn').forEach((b) => b.addEventListener('click', () => {
    const p = presets.find((x) => x.id === b.dataset.preset);
    if (!p) return;
    selectedTweaks = new Set(p.tweakIds);
    activeTab = 'tweaks';
    rerender(root);
  }));

  root.querySelectorAll('[data-repair]').forEach((b) => b.addEventListener('click', async () => {
    repairBusy = true; repairLog = 'Running ' + b.dataset.repair + '...';
    await rerender(root);
    const res = await window.cobalt.optimizeRepair(b.dataset.repair);
    repairBusy = false;
    repairLog = (res.ok ? res.output : 'Error: ' + res.error) || '(no output)';
    await rerender(root);
  }));
}

function updateButtons(root) {
  const total = selectedTweaks.size + selectedApps.size;
  const applyBtn = root.querySelector('#applyBtn');
  const revertBtn = root.querySelector('#revertBtn');
  if (applyBtn) { applyBtn.disabled = total === 0 || busy; applyBtn.innerHTML = `<i class="fa-solid fa-play"></i> Apply (${total})`; }
  if (revertBtn) revertBtn.disabled = selectedTweaks.size === 0 || busy;
}

async function runApply(root, mode) {
  const totalOps = selectedTweaks.size + (mode === 'apply' ? selectedApps.size : 0);
  const decision = await confirmDialog({
    title: mode === 'apply' ? 'Apply changes?' : 'Revert changes?',
    body: `You are about to <b>${mode === 'apply' ? 'apply' : 'revert'}</b> ${selectedTweaks.size} tweak${selectedTweaks.size === 1 ? '' : 's'}${mode === 'apply' && selectedApps.size ? ` and <b>remove ${selectedApps.size} app${selectedApps.size === 1 ? '' : 's'}</b>` : ''}.<br><br>These changes modify the Windows registry and system state.`,
    confirmLabel: mode === 'apply' ? 'Apply' : 'Revert',
    danger: mode === 'apply' && selectedApps.size > 0,
    restorePoint: true,
  });
  if (!decision.confirmed) return;

  busy = true; lastResult = null;
  await rerender(root);

  if (decision.createRestorePoint) {
    const rpRes = await window.cobalt.createRestorePoint(`Cobalt: before ${mode} tweaks`);
    if (!rpRes.ok) console.warn('Restore point failed:', rpRes.error);
  }

  let appliedCount = 0, removedCount = 0, failedCount = 0;

  if (selectedTweaks.size) {
    const res = await window.cobalt.optimizeApply(Array.from(selectedTweaks), mode);
    if (res.ok) { appliedCount = res.data.applied.length; failedCount += res.data.failed.length; }
    else failedCount += selectedTweaks.size;
  }
  if (mode === 'apply' && selectedApps.size) {
    const res = await window.cobalt.optimizeUninstall(Array.from(selectedApps));
    if (res.ok) { removedCount = res.data.removed.length; failedCount += res.data.failed.length; }
    else failedCount += selectedApps.size;
  }

  lastResult = { appliedCount, removedCount, failedCount };
  selectedTweaks.clear(); selectedApps.clear();
  busy = false;

  const statRes = await window.cobalt.optimizeStatus();
  if (statRes.ok) status = statRes.data;

  try {
    window.cobalt.notify({
      title: 'Cobalt: Optimization done',
      body: `${appliedCount + removedCount} change${appliedCount + removedCount === 1 ? '' : 's'} applied${failedCount ? `, ${failedCount} failed` : ''}.`,
    });
  } catch {}

  await rerender(root);
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('optimize')) return;
  root.innerHTML = `<div class="page">${await renderOptimize()}</div>`;
  bindOptimize(root);
}
