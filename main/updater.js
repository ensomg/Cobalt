const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { app } = require('electron');

const REPO = 'ensomg/Cobalt';
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

function getJson(url, redirects = 4) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Cobalt-Updater',
        'Accept': 'application/vnd.github+json',
      },
    }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(getJson(res.headers.location, redirects - 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Request timeout')); });
  });
}

function download(url, dest, onProgress, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Cobalt-Updater', 'Accept': 'application/octet-stream' },
    }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(download(res.headers.location, dest, onProgress, redirects - 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      const file = fs.createWriteStream(dest);
      res.on('data', (chunk) => {
        received += chunk.length;
        if (onProgress && total) onProgress({ received, total, pct: Math.floor((received / total) * 100) });
      });
      res.pipe(file);
      file.on('finish', () => file.close((err) => err ? reject(err) : resolve()));
      file.on('error', (err) => { try { fs.unlinkSync(dest); } catch {} reject(err); });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(new Error('Download timeout')); });
  });
}

function parseVersion(v) {
  const s = String(v || '').replace(/^v/i, '').trim();
  const parts = s.split(/[.\-+]/).map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function fetchLatest() {
  const rel = await getJson(RELEASES_API);
  const tag = rel && rel.tag_name;
  if (!tag) throw new Error('No tag_name in release');
  const assets = Array.isArray(rel.assets) ? rel.assets : [];
  const installer = assets.find((a) => /Setup.*\.exe$/i.test(a.name)) || assets.find((a) => /\.exe$/i.test(a.name));
  return {
    version: tag,
    downloadUrl: installer ? installer.browser_download_url : null,
    assetName: installer ? installer.name : null,
    htmlUrl: rel.html_url,
    notes: rel.body || '',
  };
}

async function check() {
  const current = app.getVersion();
  const latest = await fetchLatest();
  return {
    current,
    latest: latest.version,
    hasUpdate: isNewer(latest.version, current),
    downloadUrl: latest.downloadUrl,
    assetName: latest.assetName,
    htmlUrl: latest.htmlUrl,
    notes: latest.notes,
  };
}

async function downloadAndRun(info, onProgress) {
  if (!info || !info.downloadUrl) throw new Error('No installer asset in latest release');
  const tempDir = path.join(os.tmpdir(), 'cobalt-update');
  try { fs.mkdirSync(tempDir, { recursive: true }); } catch {}
  const dest = path.join(tempDir, info.assetName || 'CobaltSetup.exe');
  await download(info.downloadUrl, dest, onProgress);
  spawn(dest, [], { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => { try { app.quit(); } catch {} }, 500);
  return { started: true, path: dest };
}

module.exports = { check, downloadAndRun, isNewer, parseVersion };
