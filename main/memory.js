const { runPS, runPSJson } = require('./ps');

const TRIM_SCRIPT = `
$sig = @"
using System;
using System.Runtime.InteropServices;
public class PSAPI {
  [DllImport("psapi.dll")]
  public static extern int EmptyWorkingSet(IntPtr hProcess);
  [DllImport("ntdll.dll")]
  public static extern int NtSetSystemInformation(int InfoClass, IntPtr Info, int Length);
  [DllImport("advapi32.dll", SetLastError=true)]
  public static extern bool OpenProcessToken(IntPtr h, uint da, out IntPtr t);
  [DllImport("kernel32.dll")]
  public static extern IntPtr GetCurrentProcess();
  [DllImport("advapi32.dll", SetLastError=true)]
  public static extern bool LookupPrivilegeValue(string sys, string name, out long id);
  [DllImport("advapi32.dll", SetLastError=true)]
  public static extern bool AdjustTokenPrivileges(IntPtr t, bool dis, ref TP np, uint bl, IntPtr pp, IntPtr rl);
  [StructLayout(LayoutKind.Sequential)]
  public struct TP { public int Count; public long Luid; public uint Attr; }
}
"@
Add-Type -TypeDefinition $sig -Language CSharp -EA SilentlyContinue

$os = Get-CimInstance Win32_OperatingSystem
$beforeUsedMb = [int](($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1024)

$trimmed = 0
$failed = 0
foreach ($p in Get-Process) {
  try {
    if ($p.Handle) {
      $r = [PSAPI]::EmptyWorkingSet($p.Handle)
      if ($r -ne 0) { $trimmed++ } else { $failed++ }
    }
  } catch { $failed++ }
}

try {
  $tok = [IntPtr]::Zero
  [void][PSAPI]::OpenProcessToken([PSAPI]::GetCurrentProcess(), 0x28, [ref]$tok)
  $luid = 0
  [void][PSAPI]::LookupPrivilegeValue($null, 'SeProfileSingleProcessPrivilege', [ref]$luid)
  $tp = New-Object PSAPI+TP
  $tp.Count = 1; $tp.Luid = $luid; $tp.Attr = 2
  [void][PSAPI]::AdjustTokenPrivileges($tok, $false, [ref]$tp, 0, [IntPtr]::Zero, [IntPtr]::Zero)
  $info = [System.Runtime.InteropServices.Marshal]::AllocHGlobal(4)
  [System.Runtime.InteropServices.Marshal]::WriteInt32($info, 4)
  [void][PSAPI]::NtSetSystemInformation(0x50, $info, 4)
  [System.Runtime.InteropServices.Marshal]::FreeHGlobal($info)
} catch {}

Start-Sleep -Milliseconds 500
$os2 = Get-CimInstance Win32_OperatingSystem
$afterUsedMb = [int](($os2.TotalVisibleMemorySize - $os2.FreePhysicalMemory) / 1024)
$totalMb = [int]($os.TotalVisibleMemorySize / 1024)

@{
  totalMb    = $totalMb
  beforeMb   = $beforeUsedMb
  afterMb    = $afterUsedMb
  freedMb    = [Math]::Max(0, $beforeUsedMb - $afterUsedMb)
  trimmed    = $trimmed
  failed     = $failed
} | ConvertTo-Json -Compress
`;

const STATS_SCRIPT = `
$os = Get-CimInstance Win32_OperatingSystem
$totalMb = [int]($os.TotalVisibleMemorySize / 1024)
$usedMb = [int](($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1024)
@{
  totalMb = $totalMb
  usedMb  = $usedMb
  pct     = if ($totalMb -gt 0) { [int](($usedMb * 100) / $totalMb) } else { 0 }
} | ConvertTo-Json -Compress
`;

async function trim() {
  return await runPSJson(TRIM_SCRIPT, { timeoutMs: 60000 });
}

async function stats() {
  return await runPSJson(STATS_SCRIPT, { timeoutMs: 10000 });
}

module.exports = { trim, stats };
