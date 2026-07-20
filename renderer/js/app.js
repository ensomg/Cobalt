import { installErrorHandler, toast } from './ui/toast.js';
import { setCurrentRoute, getEpoch, isCurrent, pageInterval, pageTimeout } from './ui/lifecycle.js';
import { renderSystem } from './pages/system.js';
import { renderScan, getLastScan } from './pages/scan.js';
import { renderDrivers } from './pages/drivers.js';
import { renderApps } from './pages/apps.js';
import { renderOptimize } from './pages/optimize.js';
import { renderUninstaller } from './pages/uninstaller.js';
import { renderCleanup } from './pages/cleanup.js';
import { renderMemory } from './pages/memory.js';
import { renderDefender } from './pages/defender.js';
import { renderDns } from './pages/dns.js';
import { renderPower } from './pages/power.js';
import { renderCustomization } from './pages/customization.js';
import { renderSettings, applyStoredTheme, applyStoredAnimation } from './pages/settings.js';

const routes = {
  system: renderSystem,
  scan: renderScan,
  drivers: renderDrivers,
  apps: renderApps,
  optimize: renderOptimize,
  uninstaller: renderUninstaller,
  cleanup: renderCleanup,
  memory: renderMemory,
  defender: renderDefender,
  dns: renderDns,
  power: renderPower,
  customization: renderCustomization,
  settings: renderSettings,
};

const DEFAULT_ROUTE = 'system';

function setActive(route) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.route === route);
  });
}

let navInFlight = null;
async function navigate(route) {
  if (!routes[route]) route = DEFAULT_ROUTE;
  setActive(route);
  setCurrentRoute(route);
  const capturedEpoch = getEpoch();
  try { window.cobalt.rpcTab(route); } catch {}
  const main = document.getElementById('main');
  let loaderShown = false;
  const loaderTimer = setTimeout(() => {
    if (!isCurrent(route, capturedEpoch)) return;
    loaderShown = true;
    main.innerHTML = '<div class="page"><div class="page-load"><i class="fa-solid fa-spinner spin-loop"></i> Loading...</div></div>';
  }, 120);
  navInFlight = route;
  try {
    const html = await routes[route]({ getLastScan, navigate });
    clearTimeout(loaderTimer);
    if (!isCurrent(route, capturedEpoch)) return;
    main.innerHTML = `<div class="page">${html}</div>`;
    if (!isCurrent(route, capturedEpoch)) return;
    if (route === 'system') import('./pages/system.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindSystem(main); });
    if (route === 'scan') import('./pages/scan.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindScan(main, navigate); });
    if (route === 'drivers') import('./pages/drivers.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindDrivers(main); });
    if (route === 'apps') import('./pages/apps.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindApps(main); });
    if (route === 'optimize') import('./pages/optimize.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindOptimize(main); });
    if (route === 'uninstaller') import('./pages/uninstaller.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindUninstaller(main); });
    if (route === 'cleanup') import('./pages/cleanup.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindCleanup(main); });
    if (route === 'memory') import('./pages/memory.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindMemory(main); });
    if (route === 'defender') import('./pages/defender.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindDefender(main); });
    if (route === 'dns') import('./pages/dns.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindDns(main); });
    if (route === 'power') import('./pages/power.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindPower(main); });
    if (route === 'customization') import('./pages/customization.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindCustomization(main); });
    if (route === 'settings') import('./pages/settings.js').then((m) => { if (isCurrent(route, capturedEpoch)) m.bindSettings(main); });
  } catch (err) {
    clearTimeout(loaderTimer);
    if (!isCurrent(route, capturedEpoch)) return;
    main.innerHTML = `<div class="page"><div class="card" style="color:var(--crit); text-align:center; padding: 40px"><i class="fa-solid fa-triangle-exclamation" style="font-size:22px"></i><div style="margin-top:12px">Failed to load ${route}</div><div style="font-size:11px; color:var(--text-dim); margin-top:6px; font-family:monospace">${err.message || err}</div></div></div>`;
  }
}

window.__cobaltNav = { isCurrent, epoch: () => getEpoch(), pageInterval, pageTimeout };

function initNav() {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.addEventListener('click', () => {
      const route = el.dataset.route;
      location.hash = `#/${route}`;
    });
  });
  window.addEventListener('hashchange', () => {
    const route = (location.hash || '').replace('#/', '') || DEFAULT_ROUTE;
    navigate(route);
  });
}

installErrorHandler();
applyStoredTheme();
applyStoredAnimation();
initNav();
const initial = (location.hash || '').replace('#/', '') || DEFAULT_ROUTE;
navigate(initial);

let rpcRunning = false;
async function pushUsageToRpc() {
  if (rpcRunning) return;
  rpcRunning = true;
  try {
    const res = await window.cobalt.getSystemLive({ includeGpu: true });
    if (res && res.ok && res.data) {
      window.cobalt.rpcUsage({ cpu: res.data.cpuLoad, gpu: res.data.gpuLoad });
    }
  } catch {}
  finally { rpcRunning = false; }
}
setTimeout(pushUsageToRpc, 8000);
setInterval(pushUsageToRpc, 45000);
