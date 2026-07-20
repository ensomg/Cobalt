const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  enabled: true,
  showTab: true,
  showStats: true,
  showTime: true,
  customDetails: '',
  customState: '',
};

let cached = null;

function file() {
  return path.join(app.getPath('userData'), 'rpc-config.json');
}

function load() {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(file(), 'utf8');
    const parsed = JSON.parse(raw);
    cached = { ...DEFAULTS, ...parsed };
  } catch {
    cached = { ...DEFAULTS };
  }
  return cached;
}

function save(next) {
  cached = { ...DEFAULTS, ...(cached || {}), ...(next || {}) };
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(cached, null, 2), 'utf8');
  } catch {}
  return cached;
}

module.exports = { load, save, DEFAULTS };
