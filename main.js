const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let quitting = false;

app.setAppUserModelId('com.enes.cobalt');
app.setName('Cobalt');

function registerAumidForNotifications() {
  try {
    const iconPath = path.join(__dirname, 'cobaltbg.png');
    const exePath = process.execPath;
    const script = `
$aumid = 'com.enes.cobalt'
$exe = '${exePath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$icon = '${iconPath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'

$regPath = "HKCU:\\Software\\Classes\\AppUserModelId\\$aumid"
if (-not (Test-Path $regPath)) { New-Item $regPath -Force | Out-Null }
Set-ItemProperty $regPath 'DisplayName' 'Cobalt' -EA SilentlyContinue
Set-ItemProperty $regPath 'IconUri' $icon -EA SilentlyContinue
Set-ItemProperty $regPath 'IconBackgroundColor' 'FF1a1d24' -EA SilentlyContinue

$startMenu = "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs"
$linkPath = Join-Path $startMenu 'Cobalt.lnk'
if (-not (Test-Path $linkPath)) {
  try {
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcut = $WshShell.CreateShortcut($linkPath)
    $shortcut.TargetPath = $exe
    $shortcut.IconLocation = $icon
    $shortcut.WorkingDirectory = Split-Path $exe
    $shortcut.Save()
  } catch {}
}

if (Test-Path $linkPath) {
  try {
    $c = @'
using System;
using System.Runtime.InteropServices;
public static class PS {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  public static extern void SHGetPropertyStoreFromParsingName([In, MarshalAs(UnmanagedType.LPWStr)] string pszPath, IntPtr zeroWorks, int flags, ref Guid riid, [Out, MarshalAs(UnmanagedType.Interface)] out IPropertyStore ppv);
  [DllImport("propsys.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  public static extern void PSGetPropertyKeyFromName([In, MarshalAs(UnmanagedType.LPWStr)] string pszName, out PropertyKey pkey);
  [StructLayout(LayoutKind.Sequential, Pack = 4)] public struct PropertyKey { public Guid fmtid; public uint pid; }
  public struct PropVariant {
    public ushort vt; public ushort r1; public ushort r2; public ushort r3;
    public IntPtr ptr; public IntPtr ptr2;
  }
}
[ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPropertyStore {
  int GetCount(out uint props);
  int GetAt(uint prop, out PS.PropertyKey pkey);
  int GetValue(ref PS.PropertyKey key, out PS.PropVariant pv);
  int SetValue(ref PS.PropertyKey key, ref PS.PropVariant pv);
  int Commit();
}
'@
    Add-Type -TypeDefinition $c -EA Stop
    $guid = New-Object Guid('886d8eeb-8cf2-4446-8d02-cdba1dbdcf99')
    $store = $null
    [PS]::SHGetPropertyStoreFromParsingName($linkPath, [IntPtr]::Zero, 3, [ref]$guid, [ref]$store)
    $key = New-Object PS+PropertyKey
    [PS]::PSGetPropertyKeyFromName('System.AppUserModel.ID', [ref]$key)
    $pv = New-Object PS+PropVariant
    $pv.vt = 31
    $strPtr = [System.Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($aumid)
    $pv.ptr = $strPtr
    [void]$store.SetValue([ref]$key, [ref]$pv)
    [void]$store.Commit()
    [System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($strPtr)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($store) | Out-Null
  } catch {}
}
`;
    spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
  } catch {}
}
const { getSystemInfo, getSystemLive } = require('./main/system');
const { scanDrivers } = require('./main/drivers');
const { checkDriverUpdates } = require('./main/updates');
const { installUpdates } = require('./main/installer');
const { TWEAKS, BLOAT_APPS, checkTweaks, checkInstalledApps, checkAllStatus, applyTweaks, uninstallApps } = require('./main/optimize');
const wingetApps = require('./main/apps');
const uninstaller = require('./main/uninstaller');
const defender = require('./main/defender');
const cleanup = require('./main/cleanup');
const restore = require('./main/restore');
const memory = require('./main/memory');
const dns = require('./main/dns');
const power = require('./main/power');
const customization = require('./main/customization');
const { Notification } = require('electron');
const rpc = require('./main/rpc');
const updater = require('./main/updater');

function createTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, 'cobaltbg.png');
    const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(image);
    tray.setToolTip('Cobalt — running in background');
    const menu = Menu.buildFromTemplate([
      { label: 'Show Cobalt', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Quit Cobalt', click: () => { quitting = true; if (mainWindow) mainWindow.destroy(); app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  } catch {}
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#1a1d24',
    title: 'Cobalt',
    icon: path.join(__dirname, 'cobaltbg.png'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow = win;

  win.on('maximize', () => win.webContents.send('window:state', 'maximized'));
  win.on('unmaximize', () => win.webContents.send('window:state', 'normal'));

  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
    createTray();
    try {
      const { Notification } = require('electron');
      if (Notification.isSupported() && !global.__cobaltTraysNotified) {
        global.__cobaltTraysNotified = true;
        const n = new Notification({
          title: 'Cobalt is still running',
          body: 'Cobalt keeps running in the background. Right-click the tray icon to quit, or open Settings → Quit.',
          icon: path.join(__dirname, 'cobaltbg.png'),
        });
        n.show();
      }
    } catch {}
  });
}

ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window:toggleMaximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (w.isMaximized()) w.unmaximize(); else w.maximize();
});
ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.on('app:quit', () => { quitting = true; if (mainWindow) mainWindow.destroy(); app.quit(); });

ipcMain.handle('system:info', async () => {
  try { return { ok: true, data: await getSystemInfo() }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('system:live', async (_e, opts) => {
  try { return { ok: true, data: await getSystemLive(opts || {}) }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('drivers:scan', async () => {
  try { return { ok: true, data: await scanDrivers() }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('drivers:checkUpdates', async () => {
  try { return { ok: true, data: await checkDriverUpdates() }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('drivers:install', async (e, updateIds) => {
  const send = (payload) => { try { e.sender.send('drivers:install:progress', payload); } catch {} };
  try {
    const result = await installUpdates(updateIds, (ev) => send(ev));
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err.message, code: err.code };
  }
});

ipcMain.handle('optimize:list', async () => ({ ok: true, data: { tweaks: TWEAKS, apps: BLOAT_APPS, presets: require('./main/optimize').PRESETS } }));
ipcMain.handle('optimize:status', async () => {
  try { return { ok: true, data: await checkAllStatus() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:tweakStatus', async () => {
  try { return { ok: true, data: await checkTweaks() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:appsStatus', async () => {
  try { return { ok: true, data: await checkInstalledApps() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:apply', async (_e, ids, mode) => {
  try { return { ok: true, data: await applyTweaks(ids, mode) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:uninstall', async (_e, names) => {
  try { return { ok: true, data: await uninstallApps(names) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:startupList', async () => {
  try { return { ok: true, data: await require('./main/optimize').listStartupItems() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:startupToggle', async (_e, item, enable) => {
  try { await require('./main/optimize').toggleStartup(item, enable); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:startupRemove', async (_e, item) => {
  try { await require('./main/optimize').removeStartup(item); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:servicesList', async () => {
  try { return { ok: true, data: await require('./main/optimize').listServices() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:serviceStart', async (_e, name, mode) => {
  try { await require('./main/optimize').setServiceStartType(name, mode); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('optimize:repair', async (_e, kind) => {
  try { const out = await require('./main/optimize').runRepair(kind); return { ok: true, output: out }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('app:isElevated', async () => {
  return new Promise((resolve) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'], { windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.on('close', () => resolve(/True/i.test(out)));
    p.on('error', () => resolve(false));
  });
});

ipcMain.on('app:relaunchAsAdmin', () => {
  const exePath = process.execPath;
  const args = process.argv.slice(1);
  spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' -ArgumentList @(${args.map(a => `'${a.replace(/'/g, "''")}'`).join(',')}) -Verb RunAs`], { detached: true, windowsHide: true, stdio: 'ignore' }).unref();
  app.quit();
});

ipcMain.handle('apps:winget', async () => {
  try { return { ok: true, data: await wingetApps.checkWinget() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('apps:list', async (_e, ids) => {
  try { return { ok: true, data: await wingetApps.listInstalled(ids || []) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('apps:upgrades', async (_e, ids) => {
  try { return { ok: true, data: await wingetApps.listUpgrades(ids || []) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('apps:install', async (e, id) => {
  const send = (ev) => { try { e.sender.send('apps:progress', { id, ...ev }); } catch {} };
  try { await wingetApps.installApp(id, send); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('apps:uninstall', async (e, id) => {
  const send = (ev) => { try { e.sender.send('apps:progress', { id, ...ev }); } catch {} };
  try { await wingetApps.uninstallApp(id, send); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('apps:upgrade', async (e, id) => {
  const send = (ev) => { try { e.sender.send('apps:progress', { id, ...ev }); } catch {} };
  try { await wingetApps.upgradeApp(id, send); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('uninstaller:list', async () => {
  try { return { ok: true, data: await uninstaller.listInstalledPrograms() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('uninstaller:icon', async (_e, iconPath) => {
  try { return { ok: true, data: await uninstaller.getIconDataUrl(iconPath) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('uninstaller:details', async (_e, keyId) => {
  try { return { ok: true, data: await uninstaller.getRegistryDetails(keyId) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('uninstaller:uninstall', async (e, program) => {
  const send = (ev) => { try { e.sender.send('uninstaller:progress', { keyId: program.keyId, ...ev }); } catch {} };
  try { const r = await uninstaller.uninstallProgram(program, send); return { ok: true, data: r }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('uninstaller:deepclean', async (e, program) => {
  const send = (ev) => { try { e.sender.send('uninstaller:progress', { keyId: program.keyId, ...ev }); } catch {} };
  try { const r = await uninstaller.deepClean(program, send); return { ok: true, data: r }; }
  catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('defender:list', async () => ({ ok: true, data: defender.SETTINGS }));
ipcMain.handle('defender:status', async () => {
  try { return { ok: true, data: await defender.getStatus() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('defender:apply', async (_e, ids) => {
  try { return { ok: true, data: await defender.applySettings(ids) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('defender:preset', async (_e, preset) => {
  try { return { ok: true, data: await defender.applyPreset(preset) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('defender:disable', async () => {
  try { return { ok: true, data: await defender.disableCompletely() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('defender:enable', async () => {
  try { return { ok: true, data: await defender.enableCompletely() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('defender:isDisabled', async () => {
  try { return { ok: true, data: await defender.isDisabled() }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('cleanup:scan', async () => {
  try { return { ok: true, data: await cleanup.scanSizes() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('cleanup:clean', async (_e, ids) => {
  try { return { ok: true, data: await cleanup.clean(ids) }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('dns:list', async () => ({ ok: true, data: { presets: dns.PRESETS, hosts: dns.PING_HOSTS } }));
ipcMain.handle('dns:current', async () => { try { return { ok: true, data: await dns.getCurrentDns() }; } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('dns:set', async (_e, preset) => { try { return { ok: true, data: await dns.setDns(preset) }; } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('dns:pingAll', async () => { try { return { ok: true, data: await dns.pingAll() }; } catch (e) { return { ok: false, error: e.message }; } });

ipcMain.handle('power:list', async () => { try { return { ok: true, data: await power.listPlans() }; } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('power:set', async (_e, guid) => { try { return { ok: true, data: await power.setPlan(guid) }; } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('power:enableUltimate', async () => { try { return { ok: true, data: await power.enableUltimate() }; } catch (e) { return { ok: false, error: e.message }; } });

ipcMain.handle('custom:list', async () => ({ ok: true, data: customization.TWEAKS }));
ipcMain.handle('custom:status', async () => { try { return { ok: true, data: await customization.checkStatus() }; } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('custom:apply', async (_e, ids, mode) => { try { return { ok: true, data: await customization.apply(ids, mode) }; } catch (e) { return { ok: false, error: e.message }; } });

ipcMain.handle('memory:trim', async () => {
  try { return { ok: true, data: await memory.trim() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('memory:stats', async () => {
  try { return { ok: true, data: await memory.stats() }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('restore:create', async (_e, description) => {
  try { return await restore.createRestorePoint(description); }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('restore:enabled', async () => {
  try { return { ok: true, enabled: await restore.isRestoreEnabled() }; }
  catch { return { ok: false }; }
});

ipcMain.on('app:notify', (_e, payload) => {
  showNotification(payload);
});
ipcMain.handle('app:notifyTest', async () => {
  const supported = Notification.isSupported();
  showNotification({ title: 'Cobalt test notification', body: 'If you see this, notifications work. Reboot if not.' });
  return { supported };
});

function escapeForPS(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, "''");
}

function showNotification(payload) {
  const iconPath = path.join(__dirname, 'cobaltbg.png');
  const title = payload.title || 'Cobalt';
  const body = payload.body || '';

  try {
    if (Notification.isSupported()) {
      const n = new Notification({
        title, body, icon: iconPath, silent: false, timeoutType: 'default',
      });
      n.show();
    }
  } catch (e) { console.error('Electron notification failed:', e); }

  try {
    const notifier = require('node-notifier');
    notifier.notify({
      title, message: body,
      icon: iconPath,
      appID: 'com.enes.cobalt',
      sound: false,
      wait: false,
    });
  } catch (e) { console.error('node-notifier failed:', e.message); }

  try {
    const t = escapeForPS(title);
    const b = escapeForPS(body);
    const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>${t}</text><text>${b}</text></binding></visual></toast>')
$toast = New-Object Windows.UI.Notifications.ToastNotification($xml)
$aumids = @('com.enes.cobalt','Microsoft.Windows.Shell.RunDialog','Microsoft.Windows.Explorer')
foreach ($id in $aumids) {
  try { [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($id).Show($toast); break } catch {}
}
`;
    spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
  } catch (e) { console.error('PS WinRT toast failed:', e.message); }
}

ipcMain.on('rpc:tab', (_e, route) => rpc.setTab(route));
ipcMain.on('rpc:usage', (_e, payload) => rpc.setUsage(payload || {}));
ipcMain.handle('rpc:getConfig', async () => ({ ok: true, data: rpc.getConfig(), status: rpc.status() }));
ipcMain.handle('rpc:setConfig', async (_e, next) => {
  try { return { ok: true, data: rpc.setConfig(next || {}), status: rpc.status() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('rpc:status', async () => ({ ok: true, data: rpc.status() }));

ipcMain.handle('updater:check', async () => {
  try { return { ok: true, data: await updater.check() }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('updater:install', async (e, info) => {
  const send = (payload) => { try { e.sender.send('updater:progress', payload); } catch {} };
  try { return { ok: true, data: await updater.downloadAndRun(info, send) }; }
  catch (err) { return { ok: false, error: err.message }; }
});

async function checkForUpdatesOnStart(win) {
  try {
    const info = await updater.check();
    if (info.hasUpdate && info.downloadUrl) {
      const notify = () => { try { win.webContents.send('updater:forceUpdate', info); } catch {} };
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => setTimeout(notify, 1200));
      } else {
        setTimeout(notify, 1200);
      }
    }
  } catch {}
}

app.whenReady().then(() => { registerAumidForNotifications(); createWindow(); rpc.connect(); if (mainWindow) checkForUpdatesOnStart(mainWindow); });
app.on('will-quit', () => { rpc.stop(); try { require('./main/psHost').dispose(); } catch {} });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
