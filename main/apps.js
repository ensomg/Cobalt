const { spawn } = require('child_process');
const { runPS } = require('./ps');

async function checkWinget() {
  try {
    const raw = await runPS('$v = (winget --version) 2>&1; if ($LASTEXITCODE -ne 0) { throw "not-found" }; $v', { timeoutMs: 10000 });
    return { ok: true, version: String(raw).trim() };
  } catch (e) {
    return { ok: false, error: 'winget not available' };
  }
}

async function listInstalled(ids) {
  const raw = await runPS(
    'winget list --accept-source-agreements --disable-interactivity 2>&1 | Out-String',
    { timeoutMs: 60000 }
  );
  const text = String(raw || '');
  const map = {};
  for (const id of ids) {
    map[id] = text.includes(id);
  }
  return map;
}

async function listUpgrades(ids) {
  try {
    const raw = await runPS(
      'winget upgrade --accept-source-agreements --disable-interactivity 2>&1 | Out-String',
      { timeoutMs: 90000 }
    );
    const text = String(raw || '');
    const map = {};
    for (const id of ids) {
      if (!text.includes(id)) continue;
      const lineRe = new RegExp(`^.*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'm');
      const line = text.match(lineRe);
      if (line) map[id] = true;
    }
    return map;
  } catch {
    return {};
  }
}

function runWinget(args, onEvent, timeoutMs = 20 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('winget', args, { windowsHide: true });
    let buf = '';
    let lastPct = -1;
    let stdoutAll = '';
    const to = setTimeout(() => { proc.kill(); reject(new Error('winget timed out')); }, timeoutMs);

    const handle = (chunk) => {
      stdoutAll += chunk;
      buf += chunk;
      const parts = buf.split(/[\r\n]+/);
      buf = parts.pop();
      for (const line of parts) processLine(line);
    };

    const processLine = (line) => {
      const m = line.match(/(\d{1,3})%/);
      if (m) {
        const pct = Math.min(100, parseInt(m[1], 10));
        if (pct !== lastPct) {
          lastPct = pct;
          if (onEvent) onEvent({ type: 'progress', percent: pct });
        }
      }
      if (/Downloading/i.test(line) && onEvent) onEvent({ type: 'phase', phase: 'download' });
      else if (/Installing/i.test(line) && onEvent) onEvent({ type: 'phase', phase: 'install' });
      else if (/Uninstalling/i.test(line) && onEvent) onEvent({ type: 'phase', phase: 'uninstall' });
    };

    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', handle);
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', handle);
    proc.on('error', (e) => { clearTimeout(to); reject(e); });
    proc.on('close', (code) => {
      clearTimeout(to);
      if (buf) processLine(buf);
      resolve({ code, output: stdoutAll });
    });
  });
}

async function installApp(id, onEvent) {
  const { code, output } = await runWinget([
    'install', '--id', id, '--exact',
    '--accept-package-agreements', '--accept-source-agreements',
    '--disable-interactivity',
  ], onEvent);
  if (code !== 0) throw new Error(extractError(output) || `winget exited ${code}`);
  return { ok: true };
}

async function uninstallApp(id, onEvent) {
  const { code, output } = await runWinget([
    'uninstall', '--id', id, '--exact',
    '--accept-source-agreements',
    '--disable-interactivity',
  ], onEvent);
  if (code !== 0) throw new Error(extractError(output) || `winget exited ${code}`);
  return { ok: true };
}

async function upgradeApp(id, onEvent) {
  const { code, output } = await runWinget([
    'upgrade', '--id', id, '--exact',
    '--accept-package-agreements', '--accept-source-agreements',
    '--disable-interactivity',
  ], onEvent);
  if (code !== 0) throw new Error(extractError(output) || `winget exited ${code}`);
  return { ok: true };
}

function extractError(output) {
  if (!output) return null;
  const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errLine = lines.find((l) => /No package found|not found|already installed|failed|error/i.test(l));
  return errLine || null;
}

module.exports = { checkWinget, listInstalled, listUpgrades, installApp, uninstallApp, upgradeApp };
