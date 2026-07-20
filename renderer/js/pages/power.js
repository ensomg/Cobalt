import { toast } from '../ui/toast.js';

let plans = [];
let loading = true;
let applying = false;
let loadStarted = false;

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export async function renderPower() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Power Plans</h1>
        <div class="page-sub">Choose the Windows power scheme that runs your CPU throttling</div>
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn ghost" id="ultimateBtn" ${applying ? 'disabled' : ''}><i class="fa-solid fa-rocket"></i> Enable Ultimate</button>
        <button class="btn ghost icon-btn" id="powerRefresh" title="Refresh"><i class="fa-solid fa-arrows-rotate ${loading ? 'spin-loop' : ''}"></i></button>
      </div>
    </div>

    <div class="preset-grid">
      ${loading ? '<div class="card" style="grid-column: 1/-1; display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading power plans...</div>' : ''}
      ${plans.map((p) => `
        <div class="preset-card ${p.active ? 'active' : ''}" data-guid="${p.guid}">
          <div class="preset-icon"><i class="fa-solid ${p.icon}"></i></div>
          <div class="preset-name">${escapeHtml(p.name)}${p.active ? ' <span class="tag accent" style="margin-left:6px">Active</span>' : ''}</div>
          <div class="preset-desc">${escapeHtml(p.desc)}</div>
          <button class="btn ${p.active ? 'ghost' : 'primary'} small power-apply" data-guid="${p.guid}" ${applying || p.active ? 'disabled' : ''}>${p.active ? 'Current' : 'Activate'}</button>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-top: 18px; font-size: 12px; color: var(--text-dim); line-height: 1.7">
      <b style="color:var(--text)">About power plans:</b> Ultimate Performance and High Performance disable CPU parking and reduce throttling, ideal for desktops. Balanced is the safe default. Power Saver caps clocks — laptops on battery. Some plans (Ultimate) are hidden until you click "Enable Ultimate".
    </div>
  `;
}

async function load(root) {
  loading = true;
  await rerender(root);
  try {
    const res = await window.cobalt.powerList();
    if (res.ok) plans = res.data;
  } catch {}
  loading = false;
  await rerender(root);
}

async function applyPlan(root, guid) {
  applying = true;
  await rerender(root);
  const res = await window.cobalt.powerSet(guid);
  applying = false;
  if (res.ok) {
    const p = plans.find((x) => x.guid === guid);
    plans = plans.map((x) => ({ ...x, active: x.guid === guid }));
    toast({ title: 'Power plan activated', body: p ? p.name : guid, kind: 'ok' });
  } else {
    toast({ title: 'Failed to switch plan', body: res.error, kind: 'fail' });
  }
  await rerender(root);
}

async function enableUltimate(root) {
  applying = true;
  await rerender(root);
  const res = await window.cobalt.powerEnableUltimate();
  applying = false;
  if (res.ok) {
    toast({ title: 'Ultimate Performance enabled', body: 'Refresh to activate it.', kind: 'ok' });
    load(root);
  } else {
    toast({ title: 'Could not enable Ultimate', body: res.error || 'unknown', kind: 'fail' });
    await rerender(root);
  }
}

export function bindPower(root) {
  if (!loadStarted) { loadStarted = true; load(root); return; }

  const refresh = root.querySelector('#powerRefresh');
  if (refresh) refresh.addEventListener('click', () => load(root));

  const ultBtn = root.querySelector('#ultimateBtn');
  if (ultBtn) ultBtn.addEventListener('click', () => enableUltimate(root));

  root.querySelectorAll('.power-apply').forEach((b) => b.addEventListener('click', () => applyPlan(root, b.dataset.guid)));
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('power')) return;
  root.innerHTML = `<div class="page">${await renderPower()}</div>`;
  bindPower(root);
}
