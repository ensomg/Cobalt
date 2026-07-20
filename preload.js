const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cobalt', {
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  getSystemLive: (opts) => ipcRenderer.invoke('system:live', opts || {}),
  scanDrivers:   () => ipcRenderer.invoke('drivers:scan'),
  checkUpdates:  () => ipcRenderer.invoke('drivers:checkUpdates'),
  installUpdates: (ids, onProgress) => {
    const listener = (_e, payload) => { try { onProgress && onProgress(payload); } catch {} };
    ipcRenderer.on('drivers:install:progress', listener);
    const done = ipcRenderer.invoke('drivers:install', ids);
    done.finally(() => ipcRenderer.removeListener('drivers:install:progress', listener));
    return done;
  },
  optimizeList:     () => ipcRenderer.invoke('optimize:list'),
  optimizeStatus:   () => ipcRenderer.invoke('optimize:status'),
  optimizeTweakStatus: () => ipcRenderer.invoke('optimize:tweakStatus'),
  optimizeAppsStatus:  () => ipcRenderer.invoke('optimize:appsStatus'),
  optimizeApply:    (ids, mode) => ipcRenderer.invoke('optimize:apply', ids, mode),
  optimizeUninstall:(names) => ipcRenderer.invoke('optimize:uninstall', names),
  optimizeStartupList:   () => ipcRenderer.invoke('optimize:startupList'),
  optimizeStartupToggle: (item, enable) => ipcRenderer.invoke('optimize:startupToggle', item, enable),
  optimizeStartupRemove: (item) => ipcRenderer.invoke('optimize:startupRemove', item),
  optimizeServicesList:  () => ipcRenderer.invoke('optimize:servicesList'),
  optimizeServiceStart:  (name, mode) => ipcRenderer.invoke('optimize:serviceStart', name, mode),
  optimizeRepair:        (kind) => ipcRenderer.invoke('optimize:repair', kind),
  isElevated:    () => ipcRenderer.invoke('app:isElevated'),
  relaunchAsAdmin: () => ipcRenderer.send('app:relaunchAsAdmin'),
  wingetCheck:     () => ipcRenderer.invoke('apps:winget'),
  wingetList:      (ids) => ipcRenderer.invoke('apps:list', ids),
  wingetUpgrades:  (ids) => ipcRenderer.invoke('apps:upgrades', ids),
  wingetInstall:   (id, onProgress) => {
    const listener = (_e, payload) => { if (payload.id === id && onProgress) onProgress(payload); };
    ipcRenderer.on('apps:progress', listener);
    const done = ipcRenderer.invoke('apps:install', id);
    done.finally(() => ipcRenderer.removeListener('apps:progress', listener));
    return done;
  },
  wingetUninstall: (id, onProgress) => {
    const listener = (_e, payload) => { if (payload.id === id && onProgress) onProgress(payload); };
    ipcRenderer.on('apps:progress', listener);
    const done = ipcRenderer.invoke('apps:uninstall', id);
    done.finally(() => ipcRenderer.removeListener('apps:progress', listener));
    return done;
  },
  wingetUpgrade:   (id, onProgress) => {
    const listener = (_e, payload) => { if (payload.id === id && onProgress) onProgress(payload); };
    ipcRenderer.on('apps:progress', listener);
    const done = ipcRenderer.invoke('apps:upgrade', id);
    done.finally(() => ipcRenderer.removeListener('apps:progress', listener));
    return done;
  },
  uninstallerList:    () => ipcRenderer.invoke('uninstaller:list'),
  uninstallerIcon:    (iconPath) => ipcRenderer.invoke('uninstaller:icon', iconPath),
  uninstallerDetails: (keyId) => ipcRenderer.invoke('uninstaller:details', keyId),
  uninstallerRun:     (program, onProgress) => {
    const listener = (_e, payload) => { if (payload.keyId === program.keyId && onProgress) onProgress(payload); };
    ipcRenderer.on('uninstaller:progress', listener);
    const done = ipcRenderer.invoke('uninstaller:uninstall', program);
    done.finally(() => ipcRenderer.removeListener('uninstaller:progress', listener));
    return done;
  },
  uninstallerDeepClean: (program, onProgress) => {
    const listener = (_e, payload) => { if (payload.keyId === program.keyId && onProgress) onProgress(payload); };
    ipcRenderer.on('uninstaller:progress', listener);
    const done = ipcRenderer.invoke('uninstaller:deepclean', program);
    done.finally(() => ipcRenderer.removeListener('uninstaller:progress', listener));
    return done;
  },

  defenderList:   () => ipcRenderer.invoke('defender:list'),
  defenderStatus: () => ipcRenderer.invoke('defender:status'),
  defenderApply:  (ids) => ipcRenderer.invoke('defender:apply', ids),
  defenderPreset: (preset) => ipcRenderer.invoke('defender:preset', preset),
  defenderDisable: () => ipcRenderer.invoke('defender:disable'),
  defenderEnable:  () => ipcRenderer.invoke('defender:enable'),
  defenderIsDisabled: () => ipcRenderer.invoke('defender:isDisabled'),

  cleanupScan:  () => ipcRenderer.invoke('cleanup:scan'),
  cleanupClean: (ids) => ipcRenderer.invoke('cleanup:clean', ids),

  dnsList:      () => ipcRenderer.invoke('dns:list'),
  dnsCurrent:   () => ipcRenderer.invoke('dns:current'),
  dnsSet:       (preset) => ipcRenderer.invoke('dns:set', preset),
  dnsPingAll:   () => ipcRenderer.invoke('dns:pingAll'),

  powerList:    () => ipcRenderer.invoke('power:list'),
  powerSet:     (guid) => ipcRenderer.invoke('power:set', guid),
  powerEnableUltimate: () => ipcRenderer.invoke('power:enableUltimate'),

  customList:   () => ipcRenderer.invoke('custom:list'),
  customStatus: () => ipcRenderer.invoke('custom:status'),
  customApply:  (ids, mode) => ipcRenderer.invoke('custom:apply', ids, mode),

  memoryTrim:  () => ipcRenderer.invoke('memory:trim'),
  memoryStats: () => ipcRenderer.invoke('memory:stats'),

  createRestorePoint: (desc) => ipcRenderer.invoke('restore:create', desc),
  restoreEnabled:     () => ipcRenderer.invoke('restore:enabled'),
  notify: (payload) => ipcRenderer.send('app:notify', payload),
  notifyTest: () => ipcRenderer.invoke('app:notifyTest'),

  rpcTab:       (route) => ipcRenderer.send('rpc:tab', route),
  rpcUsage:     (payload) => ipcRenderer.send('rpc:usage', payload),
  rpcGetConfig: () => ipcRenderer.invoke('rpc:getConfig'),
  rpcSetConfig: (cfg) => ipcRenderer.invoke('rpc:setConfig', cfg),
  rpcStatus:    () => ipcRenderer.invoke('rpc:status'),

  updaterCheck:   () => ipcRenderer.invoke('updater:check'),
  updaterInstall: (info, onProgress) => {
    const listener = (_e, payload) => { try { onProgress && onProgress(payload); } catch {} };
    ipcRenderer.on('updater:progress', listener);
    const done = ipcRenderer.invoke('updater:install', info);
    done.finally(() => ipcRenderer.removeListener('updater:progress', listener));
    return done;
  },
  onForceUpdate: (cb) => ipcRenderer.on('updater:forceUpdate', (_e, info) => cb(info)),
});

contextBridge.exposeInMainWorld('win', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
  close: () => ipcRenderer.send('window:close'),
  quit: () => ipcRenderer.send('app:quit'),
  onState: (cb) => ipcRenderer.on('window:state', (_e, s) => cb(s)),
});
