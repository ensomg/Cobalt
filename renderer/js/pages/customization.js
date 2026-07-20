import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm.js';

let tweaks = [];
let status = {};
let loading = true;
let loadStarted = false;
let selected = new Set();
let busy = false;

const CATS = {
  taskbar:    { label: 'Taskbar',     icon: 'fa-bars' },
  shell:      { label: 'Shell / Explorer', icon: 'fa-folder-tree' },
  appearance: { label: 'Appearance',  icon: 'fa-palette' },
};

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function tweakItem(t) {
  const on = !!status[t.id];
  const checked = selected.has(t.id);
  const risk = t.risk === 'warn' ? '<span class="tag" style="background:rgba(230,199,106,0.15); color:var(--warn); margin-left:8px">Caution</span>' : '';
  return `
    <label class="opt-item ${on ? 'opt-on' : ''}">
      <input type="checkbox" ${checked ? 'checked' : ''} data-cb="${t.id}" />
      <div class="opt-body">
        <div class="opt-title">${escapeHtml(t.title)}${on ? ' <span class="tag muted" style="margin-left:8px"><i class="fa-solid fa-check"></i> Applied</span>' : ''}${risk}</div>
        <div class="opt-desc">${escapeHtml(t.desc)}</div>
      </div>
    </label>
  `;
}

function categorySection(catId) {
  const meta = CATS[catId];
  const items = tweaks.filter((t) => t.category === catId);
  if (!items.length) return '';
  const onCount = items.filter((t) => status[t.id]).length;
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid ${meta.icon}" style="color:var(--accent)"></i>
        <div class="opt-section-title">${meta.label}</div>
        <div class="opt-section-count">${onCount}/${items.length} applied</div>
      </div>
      <div class="opt-grid">${items.map(tweakItem).join('')}</div>
    </div>
  `;
}

export async function renderCustomization() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Windows Customization</h1>
        <div class="page-sub">Taskbar layout, classic context menu, dark mode & more — Windows 11 shell tweaks</div>
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn ghost" id="revertBtn" ${!selected.size || busy ? 'disabled' : ''}><i class="fa-solid fa-rotate-left"></i> Revert</button>
        <button class="btn primary" id="applyBtn" ${!selected.size || busy ? 'disabled' : ''}><i class="fa-solid fa-play"></i> Apply (${selected.size})</button>
      </div>
    </div>
    ${loading ? '<div class="card" style="display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading current Windows shell settings...</div>' : ''}
    ${busy ? '<div class="card" style="display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Applying tweaks...</div>' : ''}
    ${!loading ? Object.keys(CATS).map(categorySection).join('') : ''}
    ${!loading ? '<div class="card" style="margin-top: 18px; font-size: 12px; color: var(--text-dim); line-height: 1.7"><b style="color:var(--text)">Note:</b> Some tweaks restart Windows Explorer to apply. Your open File Explorer windows may close briefly. Task Manager and taskbar changes take effect immediately.</div>' : ''}
  `;
}

async function load(root) {
  loading = true;
  await rerender(root);
  const [listRes, statRes] = await Promise.all([window.cobalt.customList(), window.cobalt.customStatus()]);
  if (listRes.ok) tweaks = listRes.data;
  if (statRes.ok) status = statRes.data;
  loading = false;
  await rerender(root);
}

async function runApply(root, mode) {
  const decision = await confirmDialog({
    title: mode === 'apply' ? 'Apply Windows tweaks?' : 'Revert Windows tweaks?',
    body: `${selected.size} shell customization tweak${selected.size === 1 ? '' : 's'} will be ${mode === 'apply' ? 'applied' : 'reverted'}.<br>Windows Explorer will restart for some settings.`,
    confirmLabel: mode === 'apply' ? 'Apply' : 'Revert',
    danger: false,
    restorePoint: true,
  });
  if (!decision.confirmed) return;

  if (decision.createRestorePoint) {
    await window.cobalt.createRestorePoint(`Cobalt: before Windows customization ${mode}`);
  }

  busy = true;
  await rerender(root);
  const res = await window.cobalt.customApply(Array.from(selected), mode);
  busy = false;

  if (res.ok) {
    toast({
      title: `Windows customization ${mode === 'apply' ? 'applied' : 'reverted'}`,
      body: `${res.data.applied.length} succeeded${res.data.failed.length ? ', ' + res.data.failed.length + ' failed' : ''}.`,
      kind: res.data.failed.length ? 'warn' : 'ok',
    });
  } else {
    toast({ title: 'Failed', body: res.error, kind: 'fail' });
  }

  selected.clear();
  const statRes = await window.cobalt.customStatus();
  if (statRes.ok) status = statRes.data;
  await rerender(root);
}

export function bindCustomization(root) {
  if (!loadStarted) { loadStarted = true; load(root); return; }

  root.querySelectorAll('[data-cb]').forEach((cb) => cb.addEventListener('change', () => {
    const id = cb.dataset.cb;
    if (cb.checked) selected.add(id); else selected.delete(id);
    const applyBtn = root.querySelector('#applyBtn');
    const revertBtn = root.querySelector('#revertBtn');
    if (applyBtn) { applyBtn.disabled = !selected.size || busy; applyBtn.innerHTML = `<i class="fa-solid fa-play"></i> Apply (${selected.size})`; }
    if (revertBtn) revertBtn.disabled = !selected.size || busy;
  }));

  const applyBtn = root.querySelector('#applyBtn');
  if (applyBtn) applyBtn.addEventListener('click', () => runApply(root, 'apply'));
  const revertBtn = root.querySelector('#revertBtn');
  if (revertBtn) revertBtn.addEventListener('click', () => runApply(root, 'revert'));
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('customization')) return;
  root.innerHTML = `<div class="page">${await renderCustomization()}</div>`;
  bindCustomization(root);
}
