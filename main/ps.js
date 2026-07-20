const { spawn } = require('child_process');
const host = require('./psHost');

function runPS(script, opts = {}) {
  return host.run(script, opts);
}

async function runPSJson(script, opts) {
  return host.runJson(script, opts);
}

function runPSOnce(script, { timeoutMs = 45000 } = {}) {
  return new Promise((resolve, reject) => {
    const prelude = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ";
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-OutputFormat', 'Text', '-Command', prelude + script],
      { windowsHide: true }
    );

    let out = Buffer.alloc(0);
    let err = '';
    const to = setTimeout(() => {
      ps.kill();
      reject(new Error('PowerShell timed out'));
    }, timeoutMs);

    ps.stdout.on('data', (d) => { out = Buffer.concat([out, d]); });
    ps.stderr.on('data', (d) => { err += d.toString('utf8'); });
    ps.on('error', (e) => { clearTimeout(to); reject(e); });
    ps.on('close', (code) => {
      clearTimeout(to);
      if (code !== 0) return reject(new Error(err.trim() || `PowerShell exited ${code}`));
      const text = out.toString('utf8').replace(/^﻿/, '').trim();
      resolve(text);
    });
  });
}

function runPSStream(script, { timeoutMs = 600000, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const prelude = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ";
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-OutputFormat', 'Text', '-Command', prelude + script],
      { windowsHide: true }
    );

    let stdoutBuf = '';
    let err = '';
    const lines = [];
    const to = setTimeout(() => { ps.kill(); reject(new Error('PowerShell timed out')); }, timeoutMs);

    ps.stdout.setEncoding('utf8');
    ps.stdout.on('data', (chunk) => {
      stdoutBuf += chunk;
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, idx).replace(/\r$/, '').replace(/^﻿/, '');
        stdoutBuf = stdoutBuf.slice(idx + 1);
        lines.push(line);
        if (onLine) { try { onLine(line); } catch {} }
      }
    });
    ps.stderr.on('data', (d) => { err += d.toString('utf8'); });
    ps.on('error', (e) => { clearTimeout(to); reject(e); });
    ps.on('close', (code) => {
      clearTimeout(to);
      if (stdoutBuf.length) {
        const line = stdoutBuf.replace(/^﻿/, '');
        lines.push(line);
        if (onLine) { try { onLine(line); } catch {} }
      }
      if (code !== 0) return reject(new Error(err.trim() || `PowerShell exited ${code}`));
      resolve(lines);
    });
  });
}

module.exports = { runPS, runPSJson, runPSStream };
