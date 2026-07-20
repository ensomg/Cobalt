const PALETTES = [
  {
    id: 'ocean',
    name: 'Ocean Blue',
    accent: '#5aa9ff', secondary: '#7cc5ff',
    bg0: '#0f1620', bg1: '#141c2a', bg2: '#1a2434', bg3: '#232f42',
    border: '#2f3a52', borderDim: '#1e2637',
    text: '#dae2ee', textDim: '#8b96ab',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    accent: '#a855f7', secondary: '#c084fc',
    bg0: '#0e0b1a', bg1: '#161227', bg2: '#1f1935', bg3: '#2a2245',
    border: '#3a2e56', borderDim: '#22193b',
    text: '#e0d8f0', textDim: '#a094b8',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    accent: '#ff007f', secondary: '#00ffff',
    bg0: '#0d0716', bg1: '#181025', bg2: '#221636', bg3: '#301c4a',
    border: '#4a2760', borderDim: '#241635',
    text: '#f0dfff', textDim: '#a692b8',
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    accent: '#22c55e', secondary: '#4ade80',
    bg0: '#0d1512', bg1: '#131e19', bg2: '#1a2822', bg3: '#22362d',
    border: '#2e4a3d', borderDim: '#1c2b24',
    text: '#dae8de', textDim: '#8ba398',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    accent: '#f97316', secondary: '#fbbf24',
    bg0: '#161009', bg1: '#211710', bg2: '#2d2018', bg3: '#3d2c22',
    border: '#503b2d', borderDim: '#2b1e14',
    text: '#efe4d3', textDim: '#b09880',
  },
  {
    id: 'crimson',
    name: 'Crimson Night',
    accent: '#ef4444', secondary: '#f87171',
    bg0: '#150c0e', bg1: '#1e1214', bg2: '#2a1a1d', bg3: '#3a2529',
    border: '#4d2f34', borderDim: '#2b1a1d',
    text: '#efdde0', textDim: '#b0949a',
  },
  {
    id: 'cyan',
    name: 'Cyan Wave',
    accent: '#22d3ee', secondary: '#67e8f9',
    bg0: '#0a1418', bg1: '#111e23', bg2: '#182a30', bg3: '#213942',
    border: '#2c4b56', borderDim: '#182930',
    text: '#d4e6ed', textDim: '#88a5b0',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    accent: '#e5e7eb', secondary: '#ffffff',
    bg0: '#0a0a0a', bg1: '#141414', bg2: '#1e1e1e', bg3: '#2a2a2a',
    border: '#3a3a3a', borderDim: '#222222',
    text: '#e5e5e5', textDim: '#909090',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    accent: '#94a3b8', secondary: '#cbd5e1',
    bg0: '#111318', bg1: '#181b22', bg2: '#20242d', bg3: '#2b303c',
    border: '#3a4050', borderDim: '#1e2229',
    text: '#dae0e8', textDim: '#8b95a5',
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    accent: '#f43f5e', secondary: '#fb7185',
    bg0: '#150e11', bg1: '#1e1418', bg2: '#2a1c20', bg3: '#392830',
    border: '#4c3540', borderDim: '#2a1c21',
    text: '#efdde3', textDim: '#b0949e',
  },
  {
    id: 'matcha',
    name: 'Matcha',
    accent: '#84cc16', secondary: '#a3e635',
    bg0: '#101408', bg1: '#171d0e', bg2: '#1f2814', bg3: '#2a361c',
    border: '#39472a', borderDim: '#1e2814',
    text: '#e3ead4', textDim: '#9aa787',
  },
  {
    id: 'default',
    name: 'Cobalt Default',
    accent: '#5aa9ff', secondary: '#7cc5ff',
    bg0: '#1a1d24', bg1: '#21242c', bg2: '#272b34', bg3: '#313641',
    border: '#3a4050', borderDim: '#2f333d',
    text: '#d7dae0', textDim: '#8a909c',
  },
];

const STORAGE_KEY = 'cobalt:palette';
const ANIM_KEY = 'cobalt:anim';
let activeTab = 'theme';

const ANIM_PRESETS = [
  { id: 'off',    name: 'Off',        desc: 'No animations. Instant transitions.',         speed: 0, easing: 'linear', icon: 'fa-forward-fast' },
  { id: 'smooth', name: 'Smooth',     desc: 'Balanced default — 220ms cubic ease.',        speed: 1, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', icon: 'fa-water' },
  { id: 'fast',   name: 'Fast',       desc: 'Snappy 120ms for power users.',               speed: 0.55, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', icon: 'fa-bolt' },
  { id: 'funky',  name: 'Funky',      desc: 'Playful bounces & overshoots.',               speed: 1.2, easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', icon: 'fa-face-grin-stars' },
  { id: 'slow',   name: 'Cinematic',  desc: 'Slow, luxurious 500ms transitions.',          speed: 2.2, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', icon: 'fa-film' },
];

export function applyStoredAnimation() {
  const id = localStorage.getItem(ANIM_KEY) || 'smooth';
  const p = ANIM_PRESETS.find((x) => x.id === id) || ANIM_PRESETS[1];
  applyAnim(p);
}

function applyAnim(p) {
  const r = document.documentElement.style;
  r.setProperty('--anim-speed', String(p.speed));
  r.setProperty('--anim-easing', p.easing);
  document.body.classList.toggle('anim-off', p.id === 'off');
}

function applyPalette(p) {
  const r = document.documentElement.style;
  r.setProperty('--accent', p.accent);
  r.setProperty('--accent-2', p.secondary || p.accent);
  r.setProperty('--bg-0', p.bg0);
  r.setProperty('--bg-1', p.bg1);
  r.setProperty('--bg-2', p.bg2);
  r.setProperty('--bg-3', p.bg3);
  r.setProperty('--border', p.border);
  r.setProperty('--border-dim', p.borderDim);
  r.setProperty('--text', p.text);
  r.setProperty('--text-dim', p.textDim);
  const hex = p.accent.replace('#', '');
  const rr = parseInt(hex.slice(0, 2), 16);
  const gg = parseInt(hex.slice(2, 4), 16);
  const bb = parseInt(hex.slice(4, 6), 16);
  r.setProperty('--accent-glow', `rgba(${rr}, ${gg}, ${bb}, 0.22)`);
}

export function applyStoredTheme() {
  const id = localStorage.getItem(STORAGE_KEY) || 'ocean';
  const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
  applyPalette(p);
}

function activePaletteId() {
  return localStorage.getItem(STORAGE_KEY) || 'ocean';
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function themeHtml() {
  const current = activePaletteId();
  const swatches = PALETTES.map((p) => `
    <div class="palette ${p.id === current ? 'active' : ''}" data-pal="${p.id}" style="background: ${p.bg1}; border-color: ${p.id === current ? p.accent : p.borderDim}">
      <div class="palette-preview" style="background: ${p.bg0}">
        <div class="palette-preview-side" style="background: ${p.bg0}; border-right: 1px solid ${p.borderDim}">
          <div class="palette-preview-dot" style="background: ${p.accent}"></div>
          <div class="palette-preview-icon" style="background: ${p.bg3}"></div>
          <div class="palette-preview-icon" style="background: ${p.accent}; opacity: 0.85"></div>
          <div class="palette-preview-icon" style="background: ${p.bg3}"></div>
        </div>
        <div class="palette-preview-main" style="background: ${p.bg0}">
          <div class="palette-preview-line" style="background: ${p.text}; opacity: 0.6; width: 60%"></div>
          <div class="palette-preview-line" style="background: ${p.textDim}; width: 40%"></div>
          <div class="palette-preview-card" style="background: ${p.bg1}; border: 1px solid ${p.borderDim}">
            <div class="palette-preview-line" style="background: ${p.accent}; width: 40%; height: 4px"></div>
            <div class="palette-preview-line" style="background: ${p.textDim}; width: 70%; opacity: 0.4"></div>
          </div>
        </div>
      </div>
      <div class="palette-info">
        <div class="palette-swatch-grad" style="background: linear-gradient(135deg, ${p.accent}, ${p.secondary})"></div>
        <div style="flex:1; min-width: 0">
          <div class="p-name" style="color: ${p.text}">${p.name}</div>
          <div class="p-hex" style="color: ${p.textDim}">${p.accent}</div>
        </div>
        ${p.id === current ? '<i class="fa-solid fa-check" style="color:' + p.accent + '"></i>' : ''}
      </div>
    </div>
  `).join('');
  return `
    <div class="card">
      <h3 style="margin:0 0 6px; font-size:14px; font-weight:600">Theme</h3>
      <p style="color:var(--text-dim); margin:0 0 18px; font-size:12px">
        Applies to the entire app — background, borders, text and accent all shift together. ${PALETTES.length} themes.
      </p>
      <div class="theme-grid">${swatches}</div>
    </div>
  `;
}

function aboutHtml() {
  return `
    <div class="card">
      <div class="about-box">
        <div class="big-logo"><img src="cobaltbg.png" alt="Cobalt" /></div>
        <div style="flex:1">
          <h2 style="margin:0 0 4px; font-size:22px; letter-spacing:1px">Cobalt</h2>
          <div style="color:var(--text-dim); font-size:12px">
            Version 0.1.0 &middot; Built by Enes
          </div>
          <p style="margin:14px 0 0; max-width:560px; color:var(--text-dim); font-size:12px; line-height:1.7">
            Cobalt is a modern system maintenance tool that combines PC hardware inventory,
            driver tracking, one-click app installation, deep Windows tweaks, bloatware removal,
            disk cleanup, memory optimization and Defender hardening in one polished interface.
          </p>
          <div style="margin-top: 18px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
            <button class="btn" id="quitCobaltBtn"><i class="fa-solid fa-power-off"></i> Quit Cobalt</button>
            <button class="btn ghost" id="testNotifBtn"><i class="fa-solid fa-bell"></i> Test Notification</button>
            <span style="font-size:11px; color:var(--text-mute)">Closing (X) keeps Cobalt in the background — use Quit to fully exit.</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 12px">
      <h3 style="margin:0 0 12px; font-size:14px; font-weight:600"><i class="fa-solid fa-heart" style="color:var(--crit); margin-right:6px"></i> Credits & Inspiration</h3>
      <div class="credit-grid">
        <a class="credit-item" href="https://github.com/Raphire/Win11Debloat" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#0d1117"><i class="fa-brands fa-github"></i></div>
          <div><div class="credit-name">Win11Debloat</div><div class="credit-desc">Raphire — Bloatware list, tweaks, debloat approach</div></div>
        </a>
        <a class="credit-item" href="https://github.com/AndyFul/ConfigureDefender" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#0d1117"><i class="fa-solid fa-shield-halved"></i></div>
          <div><div class="credit-name">ConfigureDefender</div><div class="credit-desc">AndyFul — Defender registry policies, ASR rules</div></div>
        </a>
        <a class="credit-item" href="https://github.com/christitustech/winutil" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#0d1117"><i class="fa-brands fa-github"></i></div>
          <div><div class="credit-name">Chris Titus WinUtil</div><div class="credit-desc">christitustech — Service tweaks, performance registry</div></div>
        </a>
        <a class="credit-item" href="https://www.oo-software.com/en/shutup10" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#d1002b"><i class="fa-solid fa-user-slash"></i></div>
          <div><div class="credit-name">O&amp;O ShutUp10++</div><div class="credit-desc">Privacy policies for Windows 10/11</div></div>
        </a>
        <a class="credit-item" href="https://privacy.sexy" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#e11d48"><i class="fa-solid fa-lock"></i></div>
          <div><div class="credit-name">privacy.sexy</div><div class="credit-desc">Community privacy scripts and hardening</div></div>
        </a>
        <a class="credit-item" href="https://getsparkle.net" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#7c3aed"><i class="fa-solid fa-star"></i></div>
          <div><div class="credit-name">Sparkle</div><div class="credit-desc">Tweak/DNS manager, cleaner preset reference</div></div>
        </a>
        <a class="credit-item" href="https://henrypp.org/product/memreduct" target="_blank" rel="noopener">
          <div class="credit-icon" style="background:#4a90e2"><i class="fa-solid fa-memory"></i></div>
          <div><div class="credit-name">MemReduct</div><div class="credit-desc">Henry++ — Memory trimming approach</div></div>
        </a>
      </div>
      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-dim); font-size: 11px; color: var(--text-mute); line-height: 1.7">
        <b>Windows APIs used:</b> Win32_* CIM classes (WMI), Microsoft.Update.Session (Windows Update Agent),
        Get-PnpDevice, Get-AppxPackage, Get-Counter (perf), Get-Service, Get-PhysicalDisk, Get-Volume,
        Appx registry (fast enumeration), Windows Notification API, System Restore, EmptyWorkingSet + NtSetSystemInformation.<br>
        <b>Third-party tools invoked:</b> winget, sfc, DISM, chkdsk, netsh, ipconfig, powercfg,
        Set-MpPreference, Clear-DnsClientCache, Clear-RecycleBin, Checkpoint-Computer.
      </div>
    </div>
  `;
}

function animHtml() {
  const current = localStorage.getItem(ANIM_KEY) || 'smooth';
  return `
    <div class="card">
      <h3 style="margin:0 0 6px; font-size:14px; font-weight:600">Animation Preset</h3>
      <p style="color:var(--text-dim); margin:0 0 18px; font-size:12px">
        Controls transition speed and easing across the whole app.
      </p>
      <div class="preset-grid">
        ${ANIM_PRESETS.map((p) => `
          <div class="preset-card ${p.id === current ? 'active' : ''}" data-anim="${p.id}">
            <div class="preset-icon"><i class="fa-solid ${p.icon}"></i></div>
            <div class="preset-name">${escapeHtml(p.name)}${p.id === current ? ' <i class="fa-solid fa-check" style="color:var(--accent); margin-left:6px"></i>' : ''}</div>
            <div class="preset-desc">${escapeHtml(p.desc)}</div>
            <button class="btn ${p.id === current ? 'ghost' : 'primary'} small anim-apply" data-anim="${p.id}">${p.id === current ? 'Current' : 'Select'}</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

let rpcCfg = null;
let rpcStat = null;

async function loadRpc() {
  try {
    const r = await window.cobalt.rpcGetConfig();
    if (r && r.ok) { rpcCfg = r.data; rpcStat = r.status; }
  } catch {}
  if (!rpcCfg) rpcCfg = { enabled: true, showTab: true, showStats: true, showTime: true, customDetails: '', customState: '' };
  if (!rpcStat) rpcStat = { enabled: rpcCfg.enabled, connected: false };
}

function discordHtml() {
  const c = rpcCfg || {};
  const s = rpcStat || {};
  const dotColor = s.connected ? 'var(--ok)' : (c.enabled ? 'var(--warn)' : 'var(--text-mute)');
  const dotLabel = s.connected ? 'Connected to Discord' : (c.enabled ? 'Waiting for Discord' : 'Disabled');
  const row = (id, label, desc, checked) => `
    <label class="rpc-row" for="rpc-${id}">
      <div style="flex:1; min-width:0">
        <div style="font-size:12px; font-weight:600">${escapeHtml(label)}</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:2px">${escapeHtml(desc)}</div>
      </div>
      <input type="checkbox" id="rpc-${id}" data-rpc-key="${id}" ${checked ? 'checked' : ''} />
    </label>`;
  return `
    <div class="card">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
        <i class="fa-brands fa-discord" style="font-size:20px; color:#5865f2"></i>
        <div style="flex:1">
          <h3 style="margin:0; font-size:14px; font-weight:600">Discord Rich Presence</h3>
          <div style="font-size:11px; color:var(--text-dim); margin-top:2px">Show what you're doing in Cobalt on your Discord profile.</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-dim)">
          <span style="width:8px; height:8px; border-radius:50%; background:${dotColor}; box-shadow:0 0 6px ${dotColor}"></span>
          ${escapeHtml(dotLabel)}
        </div>
      </div>

      <div class="rpc-list">
        ${row('enabled', 'Enable Discord Rich Presence', 'Master switch. Turn off to hide Cobalt from your Discord profile.', c.enabled)}
        ${row('showTab', 'Show current section', 'Displays the active tab (e.g. "Driver Management") as the first line.', c.showTab)}
        ${row('showStats', 'Show CPU / GPU usage', 'Live CPU and GPU percentages appear on the second line.', c.showStats)}
        ${row('showTime', 'Show elapsed time', 'Includes the "elapsed" counter next to the presence card.', c.showTime)}
      </div>

      <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border-dim)">
        <div style="font-size:12px; font-weight:600; margin-bottom:4px">Custom text (optional)</div>
        <div style="font-size:11px; color:var(--text-dim); margin-bottom:10px">
          Overrides the default lines when filled. Placeholders:
          <code>{tab}</code>, <code>{cpu}</code>, <code>{gpu}</code>, <code>{stats}</code>, <code>{version}</code>.
        </div>
        <label style="display:block; margin-bottom:10px">
          <div style="font-size:11px; color:var(--text-dim); margin-bottom:4px">Line 1 (details)</div>
          <input type="text" id="rpcCustomDetails" maxlength="128" class="rpc-input" placeholder="Leave empty for default" value="${escapeHtml(c.customDetails || '')}" />
        </label>
        <label style="display:block">
          <div style="font-size:11px; color:var(--text-dim); margin-bottom:4px">Line 2 (state)</div>
          <input type="text" id="rpcCustomState" maxlength="128" class="rpc-input" placeholder="Leave empty for default" value="${escapeHtml(c.customState || '')}" />
        </label>
        <div style="margin-top:12px; display:flex; gap:8px">
          <button class="btn primary small" id="rpcSaveBtn"><i class="fa-solid fa-check"></i> Save text</button>
          <button class="btn ghost small" id="rpcResetBtn"><i class="fa-solid fa-rotate-left"></i> Reset defaults</button>
        </div>
      </div>

      <div style="margin-top:16px; padding:12px; border:1px solid var(--border-dim); border-radius:var(--r-sm); background:var(--bg-1); font-size:11px; color:var(--text-dim); line-height:1.7">
        <b style="color:var(--text)">Not working?</b> Make sure the Discord desktop app is running (not the browser version), and that
        <i>Activity Privacy → Display current activity as a status message</i> is enabled in Discord settings.
      </div>
    </div>
  `;
}

function tabBody() {
  if (activeTab === 'theme') return themeHtml();
  if (activeTab === 'anim') return animHtml();
  if (activeTab === 'discord') return discordHtml();
  return aboutHtml();
}

export async function renderSettings() {
  await loadRpc();
  const body = tabBody();
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <div class="page-sub">Theme, animations, Discord integration and app information</div>
      </div>
    </div>
    <div class="settings-tabs">
      <div class="tab ${activeTab === 'theme' ? 'active' : ''}" data-tab="theme"><i class="fa-solid fa-palette"></i> Theme</div>
      <div class="tab ${activeTab === 'anim' ? 'active' : ''}" data-tab="anim"><i class="fa-solid fa-wand-sparkles"></i> Animations</div>
      <div class="tab ${activeTab === 'discord' ? 'active' : ''}" data-tab="discord"><i class="fa-brands fa-discord"></i> Discord</div>
      <div class="tab ${activeTab === 'about' ? 'active' : ''}" data-tab="about"><i class="fa-solid fa-circle-info"></i> About</div>
    </div>
    <div id="settingsBody">${body}</div>
  `;
}

function bindPalettes(root) {
  root.querySelectorAll('.palette').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.pal;
      const p = PALETTES.find((x) => x.id === id);
      if (!p) return;
      localStorage.setItem(STORAGE_KEY, id);
      applyPalette(p);
      const body = root.querySelector('#settingsBody');
      if (body && activeTab === 'theme') body.innerHTML = themeHtml();
      bindPalettes(root);
    });
  });
}

export function bindSettings(root) {
  const tabs = root.querySelectorAll('.tab');
  tabs.forEach((t) => t.addEventListener('click', async () => {
    activeTab = t.dataset.tab;
    const body = root.querySelector('#settingsBody');
    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === activeTab));
    if (activeTab === 'discord') await loadRpc();
    body.innerHTML = tabBody();
    if (activeTab === 'theme') bindPalettes(root);
    if (activeTab === 'anim') bindAnims(root);
    if (activeTab === 'discord') bindDiscord(root);
    const q = root.querySelector('#quitCobaltBtn');
    if (q) q.addEventListener('click', () => { if (window.win && window.win.quit) window.win.quit(); });
  }));
  bindPalettes(root);
  bindAnims(root);
  bindDiscord(root);
  const q = root.querySelector('#quitCobaltBtn');
  if (q) q.addEventListener('click', () => { if (window.win && window.win.quit) window.win.quit(); });
  const t = root.querySelector('#testNotifBtn');
  if (t) t.addEventListener('click', async () => {
    const res = await window.cobalt.notifyTest();
    import('../ui/toast.js').then(({ toast }) => toast({
      title: res.supported ? 'Notification sent' : 'Notifications not supported',
      body: res.supported ? 'Check Windows Action Center (Win+N) if you did not see it — Focus Assist may be blocking.' : 'Your system reports notifications as unsupported.',
      kind: res.supported ? 'ok' : 'warn',
      notify: false,
    }));
  });
}

async function pushRpc(patch, refreshHeader = false) {
  try {
    const r = await window.cobalt.rpcSetConfig(patch);
    if (r && r.ok) { rpcCfg = r.data; rpcStat = r.status; }
  } catch {}
  if (refreshHeader) {
    const body = document.getElementById('settingsBody');
    if (body && activeTab === 'discord') { body.innerHTML = discordHtml(); bindDiscord(document); }
  }
}

function bindDiscord(root) {
  root.querySelectorAll('input[data-rpc-key]').forEach((el) => {
    el.addEventListener('change', async () => {
      const key = el.dataset.rpcKey;
      const patch = { [key]: !!el.checked };
      const refresh = key === 'enabled';
      await pushRpc(patch, refresh);
      if (!refresh) {
        import('../ui/toast.js').then(({ toast }) => toast({ title: 'Discord settings saved', kind: 'ok', notify: false }));
      }
    });
  });
  const saveBtn = root.querySelector('#rpcSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    const d = root.querySelector('#rpcCustomDetails');
    const s = root.querySelector('#rpcCustomState');
    await pushRpc({ customDetails: d ? d.value : '', customState: s ? s.value : '' }, false);
    import('../ui/toast.js').then(({ toast }) => toast({ title: 'Custom text saved', kind: 'ok', notify: false }));
  });
  const resetBtn = root.querySelector('#rpcResetBtn');
  if (resetBtn) resetBtn.addEventListener('click', async () => {
    await pushRpc({ enabled: true, showTab: true, showStats: true, showTime: true, customDetails: '', customState: '' }, true);
    import('../ui/toast.js').then(({ toast }) => toast({ title: 'Discord settings reset', kind: 'ok', notify: false }));
  });
}

function bindAnims(root) {
  root.querySelectorAll('.anim-apply').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.anim;
    const p = ANIM_PRESETS.find((x) => x.id === id);
    if (!p) return;
    localStorage.setItem(ANIM_KEY, id);
    applyAnim(p);
    const body = root.querySelector('#settingsBody');
    if (body && activeTab === 'anim') body.innerHTML = animHtml();
    bindAnims(root);
  }));
}
