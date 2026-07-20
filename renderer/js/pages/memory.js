let stats = { totalMb: 0, usedMb: 0, pct: 0 };
let lastTrim = null;
let trimming = false;
let liveTimer = null;
let autoTimer = null;

const STORAGE_KEY = 'cobalt:memreduct';
const defaultCfg = { enabled: false, intervalMin: 30, thresholdPct: 80 };

const PRESETS = [
  { id: 'light',      name: 'Light',      desc: 'Purge every 60 min if RAM > 85%.', icon: 'fa-feather', interval: 60, threshold: 85 },
  { id: 'balanced',   name: 'Balanced',   desc: 'Purge every 30 min if RAM > 75%.', icon: 'fa-scale-balanced', interval: 30, threshold: 75 },
  { id: 'aggressive', name: 'Aggressive', desc: 'Purge every 10 min if RAM > 60%.', icon: 'fa-bolt', interval: 10, threshold: 60 },
];

function loadCfg() {
  try { return { ...defaultCfg, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...defaultCfg }; }
}
function saveCfg(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function fmtMb(mb) {
  if (mb == null) return '—';
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
  return mb + ' MB';
}

function ringSvg(pct) {
  const c = 45;
  const circ = 2 * Math.PI * c;
  const off = circ * (1 - pct / 100);
  return `
    <svg width="130" height="130" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r="${c}" fill="none" stroke="var(--bg-3)" stroke-width="10" />
      <circle cx="55" cy="55" r="${c}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 55 55)" style="transition: stroke-dashoffset 500ms ease" />
      <text x="55" y="55" text-anchor="middle" dominant-baseline="central" fill="var(--text)" font-size="18" font-weight="700" font-family="Inter, sans-serif">${pct}%</text>
      <text x="55" y="70" text-anchor="middle" dominant-baseline="central" fill="var(--text-dim)" font-size="8" font-family="Inter, sans-serif">RAM</text>
    </svg>
  `;
}

export async function renderMemory() {
  const cfg = loadCfg();
  const usedFree = `${fmtMb(stats.usedMb)} / ${fmtMb(stats.totalMb)}`;
  const barPct = stats.pct;
  const barColor = barPct >= 85 ? 'var(--crit)' : barPct >= 70 ? 'var(--warn)' : 'var(--accent)';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Memory Optimizer</h1>
        <div class="page-sub">Free standby RAM manually or on a schedule · MemReduct-style working-set trimmer</div>
      </div>
      <button class="btn primary" id="trimBtn" ${trimming ? 'disabled' : ''}>${trimming ? '<i class="fa-solid fa-spinner spin-loop"></i> Trimming' : '<i class="fa-solid fa-broom"></i> Purge Now'}</button>
    </div>

    <div class="card" style="display:flex; align-items:center; gap:22px; padding: 22px">
      <div>${ringSvg(barPct)}</div>
      <div style="flex:1">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 8px">
          <div style="font-size: 20px; font-weight: 700" data-mem-used>${usedFree}</div>
          <div style="font-size: 12px; color: var(--text-dim)" data-mem-pct>${stats.pct}% used</div>
        </div>
        <div style="height:10px; background: var(--bg-3); border-radius: 999px; overflow: hidden">
          <div data-mem-bar style="height:100%; width:${barPct}%; background: ${barColor}; border-radius: 999px; transition: width 500ms ease"></div>
        </div>
        <div style="font-size:11px; color: var(--text-mute); margin-top: 8px">Live · updated every 2 seconds</div>
        ${lastTrim ? `
          <div style="margin-top: 14px; padding: 10px 14px; background: var(--bg-0); border: 1px solid rgba(107,207,138,0.35); border-radius: 8px">
            <div style="font-size:12px; color:var(--ok)"><i class="fa-solid fa-circle-check"></i> <b>Last purge:</b> Freed ${fmtMb(lastTrim.freedMb)}, trimmed ${lastTrim.trimmed} process${lastTrim.trimmed === 1 ? '' : 'es'}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent)"></i>
        <div class="opt-section-title">Presets</div>
      </div>
      <div class="preset-grid">
        ${PRESETS.map((p) => `
          <div class="preset-card" data-mem-preset="${p.id}">
            <div class="preset-icon"><i class="fa-solid ${p.icon}"></i></div>
            <div class="preset-name">${p.name}</div>
            <div class="preset-desc">${p.desc}</div>
            <button class="btn primary small" data-apply-preset="${p.id}">Apply</button>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="opt-section">
      <div class="opt-section-head">
        <i class="fa-solid fa-clock" style="color:var(--accent)"></i>
        <div class="opt-section-title">Auto-Purge Schedule</div>
      </div>
      <div class="card" style="padding: 18px">
        <label class="opt-item" style="margin-bottom: 12px">
          <input type="checkbox" id="autoEnabled" ${cfg.enabled ? 'checked' : ''} />
          <div class="opt-body">
            <div class="opt-title">Enable auto-purge</div>
            <div class="opt-desc">Trim working sets automatically at the configured interval when RAM usage exceeds the threshold.</div>
          </div>
        </label>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px">
          <div>
            <div style="font-size:12px; color:var(--text-dim); margin-bottom: 6px">Interval: <b style="color:var(--text)">${cfg.intervalMin} min</b></div>
            <input type="range" id="intervalRange" min="5" max="120" step="5" value="${cfg.intervalMin}" style="width:100%" />
          </div>
          <div>
            <div style="font-size:12px; color:var(--text-dim); margin-bottom: 6px">Threshold: <b style="color:var(--text)">${cfg.thresholdPct}%</b></div>
            <input type="range" id="thresholdRange" min="30" max="95" step="5" value="${cfg.thresholdPct}" style="width:100%" />
          </div>
        </div>
      </div>
    </div>
  `;
}

async function refreshStats(root, doRerender = true) {
  const res = await window.cobalt.memoryStats();
  if (res.ok) stats = res.data;
  if (doRerender && document.body.contains(root)) {
    updateBarsInPlace(root);
  }
}

function updateBarsInPlace(root) {
  const circleFill = root.querySelector('svg circle[stroke-dashoffset]');
  const circleText = root.querySelector('svg text[font-size="18"]');
  const usedText = root.querySelector('[data-mem-used]');
  const pctText = root.querySelector('[data-mem-pct]');
  const bar = root.querySelector('[data-mem-bar]');
  if (usedText) usedText.textContent = `${fmtMb(stats.usedMb)} / ${fmtMb(stats.totalMb)}`;
  if (pctText) pctText.textContent = `${stats.pct}% used`;
  if (bar) {
    bar.style.width = stats.pct + '%';
    bar.style.background = stats.pct >= 85 ? 'var(--crit)' : stats.pct >= 70 ? 'var(--warn)' : 'var(--accent)';
  }
  if (circleFill) {
    const c = 45;
    const circ = 2 * Math.PI * c;
    circleFill.setAttribute('stroke-dashoffset', String(circ * (1 - stats.pct / 100)));
  }
  if (circleText) circleText.textContent = `${stats.pct}%`;
}

async function runTrim(root) {
  trimming = true;
  await rerender(root);
  const res = await window.cobalt.memoryTrim();
  trimming = false;
  if (res.ok) {
    lastTrim = res.data;
    stats = { totalMb: res.data.totalMb, usedMb: res.data.afterMb, pct: Math.round((res.data.afterMb * 100) / res.data.totalMb) };
    try {
      window.cobalt.notify({ title: 'Cobalt: Memory freed', body: `Freed ${fmtMb(res.data.freedMb)}. Trimmed ${res.data.trimmed} processes.` });
    } catch {}
  }
  await rerender(root);
}

export function bindMemory(root) {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
  refreshStats(root, true);
  liveTimer = setInterval(async () => {
    if (window.__cobaltNav && !window.__cobaltNav.isCurrent('memory')) {
      clearInterval(liveTimer); liveTimer = null; return;
    }
    const res = await window.cobalt.memoryStats();
    if (res.ok) { stats = res.data; updateBarsInPlace(root); }
  }, 5000);

  const trimBtn = root.querySelector('#trimBtn');
  if (trimBtn) trimBtn.addEventListener('click', () => runTrim(root));

  root.querySelectorAll('[data-apply-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = PRESETS.find((x) => x.id === b.dataset.applyPreset);
    if (!p) return;
    const cfg = { enabled: true, intervalMin: p.interval, thresholdPct: p.threshold };
    saveCfg(cfg);
    setupAutoTimer();
    rerender(root);
  }));

  const autoCb = root.querySelector('#autoEnabled');
  if (autoCb) autoCb.addEventListener('change', () => {
    const cfg = loadCfg();
    cfg.enabled = autoCb.checked;
    saveCfg(cfg);
    setupAutoTimer();
  });

  ['interval', 'threshold'].forEach((k) => {
    const input = root.querySelector(`#${k}Range`);
    if (input) input.addEventListener('input', () => {
      const cfg = loadCfg();
      if (k === 'interval') cfg.intervalMin = parseInt(input.value, 10);
      else cfg.thresholdPct = parseInt(input.value, 10);
      saveCfg(cfg);
      const label = input.parentElement.querySelector('b');
      if (label) label.textContent = k === 'interval' ? `${cfg.intervalMin} min` : `${cfg.thresholdPct}%`;
      setupAutoTimer();
    });
  });
}

function setupAutoTimer() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  const cfg = loadCfg();
  if (!cfg.enabled) return;
  autoTimer = setInterval(async () => {
    const res = await window.cobalt.memoryStats();
    if (res.ok && res.data.pct >= cfg.thresholdPct) {
      await window.cobalt.memoryTrim();
    }
  }, Math.max(60, cfg.intervalMin * 60) * 1000);
}

setupAutoTimer();

async function rerender(root) {
  if (window.__cobaltNav && !window.__cobaltNav.isCurrent('memory')) return;
  root.innerHTML = `<div class="page">${await renderMemory()}</div>`;
  bindMemory(root);
}
