const RPC = require('discord-rpc');

const CLIENT_ID = process.env.COBALT_DISCORD_CLIENT_ID || '1528214953608220693';
const LARGE_IMAGE_KEY = 'cobaltbg';

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

function buildActivity() {
  const parts = [];
  if (currentState.cpu != null) parts.push(`CPU: ${currentState.cpu}%`);
  if (currentState.gpu != null) parts.push(`GPU: ${currentState.gpu}%`);
  const details = currentState.tab;
  const state = parts.length ? parts.join(' · ') : 'Cobalt v0.1.0';
  return {
    details,
    state,
    startTimestamp: startTs,
    largeImageKey: LARGE_IMAGE_KEY,
    largeImageText: 'Cobalt',
    instance: false,
  };
}

async function push() {
  if (!connected || !client) return;
  try { await client.setActivity(buildActivity()); } catch (e) { /* ignore */ }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 15000);
}

function connect() {
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

module.exports = { connect, setTab, setUsage, stop };
