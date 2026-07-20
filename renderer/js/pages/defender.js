import { confirmDialog } from '../ui/confirm.js';
import { toast } from '../ui/toast.js';

let settings = [];
let status = {};
let loaded = false;
let loadStarted = false;
let busy = false;
let lastResult = null;
let selected = new Set();

const CATEGORY_META = {
  core:    { label: 'Core Protection', icon: 'fa-shield-halved' },
  cloud:   { label: 'Cloud Protection', icon: 'fa-cloud' },
  scan:    { label: 'Scanning',         icon: 'fa-magnifying-glass' },
  network: { label: 'Network',          icon: 'fa-network-wired' },
  asr:     { label: 'Attack Surface Reduction', icon: 'fa-crosshairs' },
};

const PRESETS = [
  { id: 'default', name: 'Default',        desc: 'Windows out-of-the-box settings.', icon: 'fa-shield', tone: 'muted' },
  { id: 'high',    name: 'High Protection',desc: 'Recommended balance for daily use.', icon: 'fa-shield-halved', tone: 'accent' },
  { id: 'max',     name: 'Maximum',        desc: 'Zero-tolerance cloud + all ASR rules on.', icon: 'fa-shield-cat', tone: 'accent' },
];

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isOn(s) {
  const cur = status[s.id];
  if (s.binaryToggle) return cur === true || cur === 'True';
  if (s.values) {
    const num = Number(cur);
    if (isNaN(num)) return false;
    return num !== s.values.off && num !== s.values.never && num !== s.values.default;
  }
  return !!cur;
}

function currentValueDisplay(s) {
  const cur = status[s.id];
  if (s.binaryToggle) {
    if (cur === true || cur === 'True') return 'On';
    if (cur === false || cur === 'False' || cur == null) return 'Off';
    return String(cur);
  }
  if (s.values) {
    const label = Object.entries(s.values).find(([_, v]) => v === Number(cur));
    if (label) return label[0].charAt(0).toUpperCase() + label[0].slice(1);
    return cur == null ? '(unset)' : String(cur);
  }
  return cur == null ? '(unset)' : String(cur);
}

function categorySection(catId) {
  const meta = CATEGORY_META[catId];
  const items = settings.filter((s) => s.category === catId);
  if (!items.length) return '';
  const onCount = items.filter(isOn).length;
  return `
    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid ${meta.icon}" style="color:var(--accent)"></i>
        <div class="opt-section-title">${meta.label}</div>
        <div class="opt-section-count">${onCount}/${items.length} on</div>
      </div>
      <div class="opt-grid">
        ${items.map((s) => {
          const on = isOn(s);
          const checked = selected.has(s.id);
          const stateTag = on ? '<span class="tag" style="background:rgba(107,207,138,0.15); color:var(--ok); margin-left:8px"><i class="fa-solid fa-check"></i> ' + escapeHtml(currentValueDisplay(s)) + '</span>' : '<span class="tag muted" style="margin-left:8px">' + escapeHtml(currentValueDisplay(s)) + '</span>';
          return `
            <label class="opt-item ${on ? 'opt-on' : ''}">
              <input type="checkbox" ${checked ? 'checked' : ''} data-def-cb="${s.id}" />
              <div class="opt-body">
                <div class="opt-title">${escapeHtml(s.title)} ${stateTag}</div>
                <div class="opt-desc">${escapeHtml(s.desc)}</div>
              </div>
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export async function renderDefender() {
  const presetCards = PRESETS.map((p) => `
    <div class="preset-card" data-preset="${p.id}">
      <div class="preset-icon"><i class="fa-solid ${p.icon}"></i></div>
      <div class="preset-name">${p.name}</div>
      <div class="preset-desc">${p.desc}</div>
      <button class="btn ${p.tone === 'accent' ? 'primary' : 'ghost'} small preset-apply-btn" data-preset="${p.id}" ${busy ? 'disabled' : ''}>${busy ? 'Applying...' : 'Apply'}</button>
    </div>
  `).join('');

  const cats = Object.keys(CATEGORY_META);

  const resultCard = lastResult ? `
    <div class="card" style="display:flex; align-items:center; gap:12px; margin-bottom:14px; border-color: rgba(107, 207, 138, 0.35)">
      <i class="fa-solid fa-circle-check" style="color:var(--ok); font-size:18px"></i>
      <div style="flex:1"><b>${lastResult.preset ? 'Preset "' + escapeHtml(lastResult.preset) + '" applied.' : 'Settings applied.'}</b> ${lastResult.applied ? lastResult.applied.length + ' settings' : ''} ${lastResult.asrApplied ? '· ' + lastResult.asrApplied + ' ASR rules' : ''} ${lastResult.failed && lastResult.failed.length ? '<span style="color:var(--crit)">· ' + lastResult.failed.length + ' failed</span>' : ''}</div>
      <button class="btn ghost small" id="clearRes"><i class="fa-solid fa-xmark"></i></button>
    </div>
  ` : '';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Windows Defender</h1>
        <div class="page-sub">Registry-based Defender hardening · based on ConfigureDefender</div>
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn ghost" id="revertSelBtn" ${!selected.size || busy ? 'disabled' : ''}><i class="fa-solid fa-rotate-left"></i> Turn Off (${selected.size})</button>
        <button class="btn primary" id="applySelBtn" ${!selected.size || busy ? 'disabled' : ''}><i class="fa-solid fa-play"></i> Turn On (${selected.size})</button>
        <button class="btn ghost icon-btn" id="defRefresh" title="Refresh"><i class="fa-solid fa-arrows-rotate ${!loaded ? 'spin-loop' : ''}"></i></button>
      </div>
    </div>
    ${resultCard}
    <div class="admin-banner">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div style="flex:1">
        <div style="font-weight:600">Tick individual settings and use "Turn On/Off (N)" up top, or apply a full preset below.</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:2px">Defender registry changes take effect after Windows Security refreshes. Disable Tamper Protection in Windows Security first if changes don't apply.</div>
      </div>
    </div>
    <div class="preset-grid">${presetCards}</div>
    <div class="card danger-card">
      <div style="display:flex; align-items:flex-start; gap:14px">
        <div class="hw-icon" style="background:rgba(224,138,138,0.15); color:var(--crit); flex-shrink:0"><i class="fa-solid fa-power-off"></i></div>
        <div style="flex:1">
          <div style="font-size:15px; font-weight:700; color:var(--crit)">Permanently Disable Windows Defender</div>
          <div style="font-size:12px; color:var(--text-dim); margin-top:4px; line-height:1.6">
            Nuclear option: applies <b>Group Policy DisableAntiSpyware + DisableAntiVirus</b>, forces all real-time protection off,
            sets <b>WinDefend / WdNisSvc / Sense / SecurityHealthService</b> to Disabled via registry,
            disables scheduled Defender scan tasks, and clears MAPS/cloud reporting.
            <br><br>
            <b style="color:var(--warn)">⚠ Requirements:</b> Turn off <b>Tamper Protection</b> first (Windows Security → Virus &amp; threat protection → Manage settings). Otherwise Windows will re-enable Defender within seconds.<br>
            <b style="color:var(--warn)">⚠ Reboot required.</b> A restart is needed for service changes to take effect.<br>
            <b style="color:var(--warn)">⚠ You will have no antivirus.</b> Install a third-party AV or accept the risk.
          </div>
          <div style="display:flex; gap:8px; margin-top:14px">
            <button class="btn" style="background:rgba(224,138,138,0.15); border-color:var(--crit); color:var(--crit)" id="disableDefBtn" ${busy ? 'disabled' : ''}>
              <i class="fa-solid fa-skull-crossbones"></i> Disable Permanently
            </button>
            <button class="btn ghost" id="enableDefBtn" ${busy ? 'disabled' : ''}>
              <i class="fa-solid fa-shield-halved"></i> Re-Enable Defender
            </button>
          </div>
        </div>
      </div>
    </div>
    ${!loaded ? '<div class="card" style="display:flex; gap:10px; color:var(--text-dim)"><i class="fa-solid fa-spinner spin-loop"></i> Reading Defender state...</div>' : cats.map(categorySection).join('')}
  `;
}

async function loadStatus(root) {
  const [listRes, statRes] = await Promise.all([window.cobalt.defenderList(), window.cobalt.defenderStatus()]);
  if (listRes.ok) settings = listRes.data;
  if (statRes.ok) status = statRes.data;
  loaded = true;
  await rerender(root);
}

function idsToValues(mode) {
  return Array.from(selected).map((id) => {
    const s = settings.find((x) => x.id === id);
    if (!s) return null;
    if (s.binaryToggle) return { id, value: mode === 'on' ? 'on' : 'off' };
    if (s.values) {
      const keys = Object.keys(s.values);
      if (mode === 'on') {
        return { id, value: s.default || keys[keys.length - 1] };
      }
      const offKey = keys.find((k) => k === 'off' || k === 'never') || keys[0];
      return { id, value: offKey };
    }
    return null;
  }).filter(Boolean);
}

async function runSelected(root, mode) {
  const items = idsToValues(mode);
  if (!items.length) return;

  const decision = await confirmDialog({
    title: mode === 'on' ? 'Turn on selected Defender settings?' : 'Turn off selected Defender settings?',
    body: `${items.length} Defender setting${items.length === 1 ? '' : 's'} will be ${mode === 'on' ? 'enabled to their recommended value' : 'disabled'}.`,
    confirmLabel: mode === 'on' ? 'Turn On' : 'Turn Off',
    danger: mode === 'off',
    restorePoint: true,
  });
  if (!decision.confirmed) return;

  if (decision.createRestorePoint) {
    await window.cobalt.createRestorePoint(`Cobalt: before Defender ${mode} bulk`);
  }

  busy = true;
  await rerender(root);
  const res = await window.cobalt.defenderApply(items);
  busy = false;

  if (res.ok) {
    lastResult = res.data;
    toast({
      title: `Defender: ${res.data.applied.length} setting${res.data.applied.length === 1 ? '' : 's'} ${mode === 'on' ? 'enabled' : 'disabled'}`,
      body: res.data.failed && res.data.failed.length ? `${res.data.failed.length} failed. Check Tamper Protection.` : 'Changes take effect on next Windows Security refresh.',
      kind: res.data.failed && res.data.failed.length ? 'warn' : 'ok',
    });
  } else {
    toast({ title: 'Defender: failed', body: res.error, kind: 'fail' });
  }

  selected.clear();
  const statRes = await window.cobalt.defenderStatus();
  if (statRes.ok) status = statRes.data;
  await rerender(root);
}

async function applyPreset(root, presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  const decision = await confirmDialog({
    title: `Apply "${preset ? preset.name : presetId}" preset?`,
    body: `This will set <b>13 Defender policies</b> and <b>12 ASR rules</b> according to the ${preset ? preset.name : presetId} preset.<br><br>Changes take effect after Windows Security refreshes.${presetId !== 'default' ? '<br><br><span style="color:var(--warn)">Some settings may block legitimate apps and require exceptions.</span>' : ''}`,
    confirmLabel: 'Apply',
    danger: presetId === 'max',
    restorePoint: true,
  });
  if (!decision.confirmed) return;

  if (decision.createRestorePoint) {
    await window.cobalt.createRestorePoint(`Cobalt: before Defender ${presetId} preset`);
  }

  busy = true;
  await rerender(root);
  const res = await window.cobalt.defenderPreset(presetId);
  busy = false;

  if (res.ok) {
    lastResult = { ...res.data, preset: preset ? preset.name : presetId };
    toast({ title: 'Defender preset applied', body: `${preset ? preset.name : presetId} preset is now active.`, kind: 'ok' });
  } else {
    lastResult = { failed: [{ error: res.error }] };
    toast({ title: 'Defender preset failed', body: res.error, kind: 'fail' });
  }

  const statRes = await window.cobalt.defenderStatus();
  if (statRes.ok) status = statRes.data;
  await rerender(root);
}

export function bindDefender(root) {
  if (!loadStarted) { loadStarted = true; loadStatus(root); }

  const refreshBtn = root.querySelector('#defRefresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => { loaded = false; loadStatus(root); });

  root.querySelectorAll('[data-def-cb]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.defCb;
      if (cb.checked) selected.add(id); else selected.delete(id);
      const on = root.querySelector('#applySelBtn');
      const off = root.querySelector('#revertSelBtn');
      if (on) { on.disabled = !selected.size || busy; on.innerHTML = `<i class="fa-solid fa-play"></i> Turn On (${selected.size})`; }
      if (off) { off.disabled = !selected.size || busy; off.innerHTML = `<i class="fa-solid fa-rotate-left"></i> Turn Off (${selected.size})`; }
    });
  });

  const applySel = root.querySelector('#applySelBtn');
  if (applySel) applySel.addEventListener('click', () => runSelected(root, 'on'));
  const revertSel = root.querySelector('#revertSelBtn');
  if (revertSel) revertSel.addEventListener('click', () => runSelected(root, 'off'));

  root.querySelectorAll('.preset-apply-btn').forEach((b) => b.addEventListener('click', () => applyPreset(root, b.dataset.preset)));

  const disableBtn = root.querySelector('#disableDefBtn');
  if (disableBtn) disableBtn.addEventListener('click', () => nuclearDisable(root));
  const enableBtn = root.querySelector('#enableDefBtn');
  if (enableBtn) enableBtn.addEventListener('click', () => nuclearEnable(root));

  const clearBtn = root.querySelector('#clearRes');
  if (clearBtn) clearBtn.addEventListener('click', () => { lastResult = null; rerender(root); });
}

async function nuclearDisable(root) {
  const decision = await confirmDialog({
    title: 'Permanently disable Windows Defender?',
    body: `<b style="color:var(--crit)">This is irreversible without a system restore point or manual re-enable.</b><br><br>
      Windows will have <b>no antivirus</b> after this. Tamper Protection must already be off.<br><br>
      Applies: Group Policy DisableAntiSpyware + DisableAntiVirus, all real-time protection off, Defender services set to Disabled, scheduled tasks disabled.<br><br>
      <b>A reboot is required.</b>`,
    confirmLabel: 'Disable Defender',
    danger: true,
    restorePoint: true,
  });
  if (!decision.confirmed) return;

  if (decision.createRestorePoint) {
    await window.cobalt.createRestorePoint('Cobalt: before Defender permanent disable');
  }

  busy = true;
  await rerender(root);
  const res = await window.cobalt.defenderDisable();
  busy = false;

  if (res.ok) {
    lastResult = { applied: [`${res.data.ok}/${res.data.total} disable operations`], failed: res.data.failed || [] };
    toast({
      title: 'Defender permanently disabled',
      body: `${res.data.ok}/${res.data.total} operations succeeded. Reboot to complete.${res.data.failed.length ? ` ${res.data.failed.length} failed — check Tamper Protection.` : ''}`,
      kind: res.data.failed.length ? 'warn' : 'ok',
      duration: 12000,
    });
  } else {
    toast({ title: 'Failed to disable Defender', body: res.error, kind: 'fail' });
  }

  const statRes = await window.cobalt.defenderStatus();
  if (statRes.ok) status = statRes.data;
  await rerender(root);
}

async function nuclearEnable(root) {
  const decision = await confirmDialog({
    title: 'Re-enable Windows Defender?',
    body: `Restore Defender policies, real-time protection, services and scheduled tasks to their default enabled state.<br><br>A reboot is required for services to resume.`,
    confirmLabel: 'Enable Defender',
    danger: false,
    restorePoint: false,
  });
  if (!decision.confirmed) return;

  busy = true;
  await rerender(root);
  const res = await window.cobalt.defenderEnable();
  busy = false;

  if (res.ok) {
    lastResult = { applied: [`${res.data.ok}/${res.data.total} re-enable operations`], failed: res.data.failed || [] };
    toast({
      title: 'Defender re-enabled',
      body: `${res.data.ok}/${res.data.total} operations succeeded. Reboot to fully restore.`,
      kind: res.data.failed.length ? 'warn' : 'ok',
    });
  } else {
    toast({ title: 'Failed to enable Defender', body: res.error, kind: 'fail' });
  }

  const statRes = await window.cobalt.defenderStatus();
  if (statRes.ok) status = statRes.data;
  await rerender(root);
}

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('defender')) return;
  root.innerHTML = `<div class="page">${await renderDefender()}</div>`;
  bindDefender(root);
}
