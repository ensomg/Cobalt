const { runPSJson, runPS } = require('./ps');

const TWEAKS = [
  {
    id: 'taskbar-left',
    category: 'taskbar',
    title: 'Align Taskbar to Left',
    desc: 'Move Start menu and icons to the left edge (classic Windows 10 layout).',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name TaskbarAl -EA Stop).TaskbarAl -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarAl -Value 0 -Type DWord; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarAl -Value 1 -Type DWord; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
  },
  {
    id: 'classic-context',
    category: 'shell',
    title: 'Classic Right-Click Menu (Win10 style)',
    desc: 'Removes the "Show more options" step. Full menu on right-click.',
    check: `Test-Path 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32'`,
    apply: `New-Item 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32' -Force -Value '' | Out-Null; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
    revert: `Remove-Item 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}' -Recurse -Force -EA SilentlyContinue; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
  },
  {
    id: 'small-taskbar',
    category: 'taskbar',
    title: 'Use Smaller Taskbar Icons',
    desc: 'Reduces taskbar height (Win11 22H2+ registry hack).',
    risk: 'warn',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name TaskbarSi -EA Stop).TaskbarSi -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarSi -Value 0 -Type DWord; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarSi -Value 1 -Type DWord; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
  },
  {
    id: 'combine-taskbar',
    category: 'taskbar',
    title: 'Never Combine Taskbar Buttons',
    desc: 'Show separate button for each window (Win11 22H2+).',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name TaskbarGlomLevel -EA Stop).TaskbarGlomLevel -eq 2 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarGlomLevel -Value 2 -Type DWord; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarGlomLevel -Value 0 -Type DWord; Stop-Process -Name explorer -Force -EA SilentlyContinue`,
  },
  {
    id: 'seconds-clock',
    category: 'taskbar',
    title: 'Show Seconds in System Clock',
    desc: 'Displays seconds next to time in the taskbar.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name ShowSecondsInSystemClock -EA Stop).ShowSecondsInSystemClock -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' ShowSecondsInSystemClock -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' ShowSecondsInSystemClock -Value 0 -Type DWord`,
  },
  {
    id: 'title-fullpath',
    category: 'shell',
    title: 'Show Full Path in Title Bar',
    desc: 'Explorer title bar shows the full folder path.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CabinetState' -Name FullPath -EA Stop).FullPath -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CabinetState' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CabinetState' FullPath -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CabinetState' FullPath -Value 0 -Type DWord`,
  },
  {
    id: 'compact-mode',
    category: 'shell',
    title: 'Compact Mode in Explorer',
    desc: 'Denser layout in File Explorer folders.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name UseCompactMode -EA Stop).UseCompactMode -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' UseCompactMode -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' UseCompactMode -Value 0 -Type DWord`,
  },
  {
    id: 'dark-mode',
    category: 'appearance',
    title: 'Enable Dark Mode System-wide',
    desc: 'Applies dark theme to apps and Windows shell.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name AppsUseLightTheme -EA Stop).AppsUseLightTheme -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' AppsUseLightTheme -Value 0 -Type DWord; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' SystemUsesLightTheme -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' AppsUseLightTheme -Value 1 -Type DWord; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' SystemUsesLightTheme -Value 1 -Type DWord`,
  },
  {
    id: 'accent-taskbar',
    category: 'appearance',
    title: 'Accent Color on Taskbar & Start',
    desc: 'Apply your accent color to taskbar and Start.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name ColorPrevalence -EA Stop).ColorPrevalence -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' ColorPrevalence -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' ColorPrevalence -Value 0 -Type DWord`,
  },
  {
    id: 'transparency',
    category: 'appearance',
    title: 'Enable UI Transparency',
    desc: 'Acrylic and Mica transparency in Windows shell.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name EnableTransparency -EA Stop).EnableTransparency -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' EnableTransparency -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' EnableTransparency -Value 0 -Type DWord`,
  },
  {
    id: 'no-snap-assist',
    category: 'shell',
    title: 'Disable Snap Assist',
    desc: 'Turn off the "arrange your other windows" popup after snapping.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name SnapAssist -EA Stop).SnapAssist -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' SnapAssist -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' SnapAssist -Value 1 -Type DWord`,
  },
  {
    id: 'search-icon-only',
    category: 'taskbar',
    title: 'Taskbar Search: Icon Only',
    desc: 'Replace the giant search box with a compact icon.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' -Name SearchboxTaskbarMode -EA Stop).SearchboxTaskbarMode -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' SearchboxTaskbarMode -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' SearchboxTaskbarMode -Value 2 -Type DWord`,
  },
  {
    id: 'accent-color-title',
    category: 'appearance',
    title: 'Accent Color on Title Bars',
    desc: 'Colored title bars for windows.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\DWM' -Name ColorPrevalence -EA Stop).ColorPrevalence -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\DWM' ColorPrevalence -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\DWM' ColorPrevalence -Value 0 -Type DWord`,
  },
];

function meta() {
  return TWEAKS.map((t) => ({ id: t.id, category: t.category, title: t.title, desc: t.desc, risk: t.risk || 'safe' }));
}

async function checkStatus() {
  const assigns = TWEAKS.map((t, i) => `$v${i} = try { [bool](${t.check}) } catch { $false }`).join('; ');
  const inserts = TWEAKS.map((t, i) => `$r['${t.id}'] = $v${i}`).join('; ');
  const script = `$ErrorActionPreference='SilentlyContinue'; ${assigns}; $r = [ordered]@{}; ${inserts}; $r | ConvertTo-Json -Compress`;
  return await runPSJson(script, { timeoutMs: 12000 }) || {};
}

async function apply(ids, mode = 'apply') {
  const targets = TWEAKS.filter((t) => ids.includes(t.id));
  if (targets.length === 0) return { applied: [], failed: [] };
  const scripts = targets.map((t) => {
    const body = mode === 'revert' ? t.revert : t.apply;
    return `try { ${body}; Write-Host ('OK::${t.id}') } catch { Write-Host ('FAIL::${t.id}::' + $_.Exception.Message) }`;
  }).join(';');
  const out = await runPS(`$ErrorActionPreference='SilentlyContinue'; ${scripts}`, { timeoutMs: 30000 });
  const applied = [];
  const failed = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('OK::')) applied.push(line.slice(4));
    else if (line.startsWith('FAIL::')) { const [_, id, ...rest] = line.split('::'); failed.push({ id, error: rest.join('::') }); }
  }
  return { applied, failed };
}

module.exports = { TWEAKS: meta(), checkStatus, apply };
