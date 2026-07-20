const RPC = require('discord-rpc');
const rpcConfig = require('./rpcConfig');

const CLIENT_ID = process.env.COBALT_DISCORD_CLIENT_ID || '1528214953608220693';
const LARGE_IMAGE_KEY = 'cobaltbg';
const APP_VERSION = (() => {
  try { return require('electron').app.getVersion(); } catch { return '0.1.0'; }
})();

let client = null;
let connected = false;
let startTs = null;
let currentState = { tab: 'System', cpu: null, gpu: null };
let reconnectTimer = null;

function niceTab(route) {
  switch (route) {
    case 'system':      return 'System Specs';
    case 'scan':        return 'Scanning System';
    case 'drivers':     return 'Driver Management';
    case 'apps':        return 'App Library';
    case 'optimize':    return 'Optimizing PC';
    case 'uninstaller': return 'Uninstalling Apps';
    case 'cleanup':     return 'Cleaning Disk';
    case 'defender':    return 'Configuring Defender';
    case 'settings':    return 'Settings';
    case 'dns':         return 'DNS Manager';
    case 'power':       return 'Power Plans';
    case 'customization': return 'Windows Tweaks';
    default:            return 'Idle';
  }
}

function fmtStats() {
  const parts = [];
  if (currentState.cpu != null) parts.push(`CPU: ${currentState.cpu}%`);
  if (currentState.gpu != null) parts.push(`GPU: ${currentState.gpu}%`);
  return parts.length ? parts.join(' · ') : '';
}

function interpolate(tpl) {
  return String(tpl || '')
    .replace(/\{tab\}/gi, currentState.tab || '')
    .replace(/\{cpu\}/gi, currentState.cpu != null ? `${currentState.cpu}%` : '')
    .replace(/\{gpu\}/gi, currentState.gpu != null ? `${currentState.gpu}%` : '')
    .replace(/\{stats\}/gi, fmtStats())
    .replace(/\{version\}/gi, APP_VERSION)
    .trim();
}

function buildActivity() {
  const cfg = rpcConfig.load();
  let details;
  let state;

  if (cfg.customDetails) {
    details = interpolate(cfg.customDetails);
  } else if (cfg.showTab) {
    details = currentState.tab;
  }

  if (cfg.customState) {
    state = interpolate(cfg.customState);
  } else if (cfg.showStats) {
    const s = fmtStats();
    state = s || `Cobalt v${APP_VERSION}`;
  }

  const activity = {
    largeImageKey: LARGE_IMAGE_KEY,
    largeImageText: 'Cobalt',
    instance: false,
  };
  if (details) activity.details = details.slice(0, 128);
  if (state) activity.state = state.slice(0, 128);
  if (cfg.showTime && startTs) activity.startTimestamp = startTs;

  return activity;
}

async function push() {
  if (!connected || !client) return;
  try { await client.setActivity(buildActivity()); } catch (e) { /* ignore */ }
}

async function clearPresence() {
  if (!connected || !client) return;
  try { await client.clearActivity(); } catch {}
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const cfg = rpcConfig.load();
  if (!cfg.enabled) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 15000);
}

function connect() {
  const cfg = rpcConfig.load();
  if (!cfg.enabled) return;
  if (client) return;
  try {
    RPC.register(CLIENT_ID);
    client = new RPC.Client({ transport: 'ipc' });
    client.on('ready', () => {
      connected = true;
      startTs = Math.floor(Date.now() / 1000);
      push();
    });
    client.on('disconnected', () => {
      connected = false;
      client = null;
      scheduleReconnect();
    });
    client.login({ clientId: CLIENT_ID }).catch(() => {
      client = null;
      scheduleReconnect();
    });
  } catch {
    client = null;
    scheduleReconnect();
  }
}

function setTab(route) {
  currentState.tab = niceTab(route);
  push();
}

function setUsage({ cpu, gpu }) {
  if (typeof cpu === 'number') currentState.cpu = Math.max(0, Math.min(100, Math.round(cpu)));
  if (typeof gpu === 'number') currentState.gpu = Math.max(0, Math.min(100, Math.round(gpu)));
  push();
}

function stop() {
  connected = false;
  if (client) { try { client.destroy(); } catch {} client = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function getConfig() {
  return rpcConfig.load();
}

function setConfig(next) {
  const prev = rpcConfig.load();
  const cfg = rpcConfig.save(next);
  const wasEnabled = !!prev.enabled;
  const isEnabled = !!cfg.enabled;
  if (wasEnabled && !isEnabled) {
    stop();
  } else if (!wasEnabled && isEnabled) {
    connect();
  } else {
    push();
  }
  return cfg;
}

function status() {
  return {
    enabled: !!rpcConfig.load().enabled,
    connected,
  };
}

module.exports = { connect, setTab, setUsage, stop, getConfig, setConfig, status };
