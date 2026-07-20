const { runPS } = require('./ps');

async function createRestorePoint(description = 'Cobalt: before changes') {
  const script = `
try {
  Enable-ComputerRestore -Drive 'C:\\' -EA SilentlyContinue
  Checkpoint-Computer -Description '${description.replace(/'/g, "''")}' -RestorePointType 'MODIFY_SETTINGS' -EA Stop
  Write-Host 'RESTORE_OK'
} catch {
  Write-Host ('RESTORE_FAIL::' + $_.Exception.Message)
}
`;
  const out = await runPS(script, { timeoutMs: 60000 });
  if (out.includes('RESTORE_OK')) return { ok: true };
  const err = out.split('RESTORE_FAIL::')[1] || 'unknown';
  return { ok: false, error: err.trim() };
}

async function isRestoreEnabled() {
  const script = `
$sr = Get-ComputerRestorePoint -EA SilentlyContinue
if ($sr) { Write-Host 'YES' } else {
  $key = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore'
  if (Test-Path $key) { Write-Host 'YES' } else { Write-Host 'NO' }
}
`;
  const out = await runPS(script, { timeoutMs: 10000 });
  return out.includes('YES');
}

module.exports = { createRestorePoint, isRestoreEnabled };
