const { spawn } = require('child_process');

const HOST_LOOP = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$in = [Console]::In
Write-Host '__COBALT_READY__'
while ($true) {
  $sb = New-Object System.Text.StringBuilder
  while ($true) {
    $line = $in.ReadLine()
    if ($null -eq $line) { exit 0 }
    if ($line -eq '__COBALT_EXEC__') { break }
    [void]$sb.AppendLine($line)
  }
  try {
    $script = [scriptblock]::Create($sb.ToString())
    & $script
  } catch {
    Write-Host ('__COBALT_ERR__' + $_.Exception.Message)
  }
  Write-Host '__COBALT_DONE__'
  [Console]::Out.Flush()
}
`;

class PSHost {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.busy = false;
    this.queue = [];
    this.current = null;
    this.stdout = '';
    this.stderr = '';
    this._start();
  }

  _start() {
    if (this.proc) return;
    try {
      this.proc = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-OutputFormat', 'Text', '-Command', HOST_LOOP],
        { windowsHide: true }
      );
    } catch (e) {
      this.proc = null;
      return;
    }

    this.stdout = '';
    this.stderr = '';

    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (d) => this._onData(d));
    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (d) => { this.stderr += d; });
    this.proc.on('exit', () => this._onExit());
    this.proc.on('error', () => this._onExit());
  }

  _onExit() {
    this.ready = false;
    this.proc = null;
    if (this.current) {
      const cur = this.current;
      this.current = null;
      this.busy = false;
      clearTimeout(cur.timeout);
      cur.reject(new Error('PowerShell host exited unexpectedly'));
    }
  }

  _onData(chunk) {
    this.stdout += chunk;

    if (!this.ready) {
      const idx = this.stdout.indexOf('__COBALT_READY__');
      if (idx !== -1) {
        this.stdout = this.stdout.slice(idx + '__COBALT_READY__'.length);
        this.ready = true;
        this._pump();
      }
      return;
    }

    if (!this.current) return;
    const idx = this.stdout.indexOf('__COBALT_DONE__');
    if (idx === -1) return;
    const output = this.stdout.slice(0, idx);
    this.stdout = this.stdout.slice(idx + '__COBALT_DONE__'.length);
    const cur = this.current;
    this.current = null;
    clearTimeout(cur.timeout);
    this.busy = false;
    cur.resolve(output.replace(/^﻿/, '').replace(/\r/g, '').trim());
    this._pump();
  }

  _pump() {
    if (this.busy || !this.queue.length || !this.ready || !this.proc) return;
    const job = this.queue.shift();
    this.busy = true;
    this.stderr = '';
    this.current = {
      resolve: job.resolve,
      reject: job.reject,
      timeout: setTimeout(() => {
        if (!this.current) return;
        const cur = this.current;
        this.current = null;
        this.busy = false;
        try { this.proc && this.proc.kill(); } catch {}
        cur.reject(new Error('PowerShell timed out'));
      }, job.timeoutMs || 45000),
    };
    try {
      this.proc.stdin.write(job.script);
      this.proc.stdin.write('\n__COBALT_EXEC__\n');
    } catch (e) {
      const cur = this.current;
      this.current = null;
      this.busy = false;
      clearTimeout(cur.timeout);
      job.reject(e);
    }
  }

  run(script, { timeoutMs = 45000 } = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ script, timeoutMs, resolve, reject });
      if (!this.proc) this._start();
      this._pump();
    });
  }

  runJson(script, opts) {
    return this.run(script, opts).then((raw) => {
      if (!raw) return null;
      const errIdx = raw.indexOf('__COBALT_ERR__');
      if (errIdx !== -1) throw new Error(raw.slice(errIdx + '__COBALT_ERR__'.length).split('\n')[0]);
      try { return JSON.parse(raw); } catch (e) { throw new Error(`JSON parse failed: ${e.message}\nOutput: ${raw.slice(0, 200)}`); }
    });
  }

  dispose() {
    try {
      if (this.proc) {
        try { this.proc.stdin.end(); } catch {}
        setTimeout(() => { try { this.proc && this.proc.kill(); } catch {} }, 500);
      }
    } catch {}
    this.ready = false;
  }
}

const host = new PSHost();
module.exports = host;
