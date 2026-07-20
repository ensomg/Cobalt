const path = require('path');
const fs = require('fs');
const { packager } = require('@electron/packager');
const { rcedit } = require('rcedit');

(async () => {
  const outDir = path.join(__dirname, 'dist');

  console.log('Packaging...');
  const appPaths = await packager({
    dir: __dirname,
    name: 'Cobalt',
    platform: 'win32',
    arch: 'x64',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    out: outDir,
    asar: true,
    overwrite: true,
    appCopyright: 'Copyright 2026 Enes',
    ignore: [/^\/dist/, /^\/build/, /\.md$/],
  });
  const appDir = appPaths[0];
  console.log('Packaged to', appDir);

  const exePath = path.join(appDir, 'Cobalt.exe');
  console.log('Embedding requireAdministrator manifest into', exePath);
  await rcedit(exePath, {
    'requested-execution-level': 'requireAdministrator',
    'version-string': {
      CompanyName: 'Enes',
      ProductName: 'Cobalt',
      FileDescription: 'Modern PC maintenance & driver management',
      LegalCopyright: 'Copyright 2026 Enes',
    },
    'file-version': '0.1.0.0',
    'product-version': '0.1.0.0',
  });
  console.log('Manifest embedded.');

  const finalDir = path.join(outDir, 'Cobalt-v0.1.0');
  if (fs.existsSync(finalDir)) fs.rmSync(finalDir, { recursive: true, force: true });
  fs.renameSync(appDir, finalDir);
  fs.writeFileSync(
    path.join(finalDir, 'Run as Administrator.bat'),
    "@echo off\r\npowershell -Command \"Start-Process '%~dp0Cobalt.exe' -Verb RunAs\"\r\n",
    'ascii'
  );
  fs.writeFileSync(
    path.join(finalDir, 'README.txt'),
    'Cobalt v0.1.0\r\n=============\r\n\r\nDouble-click Cobalt.exe to launch. Windows will prompt for administrator privileges (required for drivers, Defender config, service tweaks and bloatware removal).\r\n\r\nBuilt by Enes.\r\n',
    'ascii'
  );
  console.log('Renamed to', finalDir);
  console.log('Done. Launch:', path.join(finalDir, 'Cobalt.exe'));
})().catch((e) => { console.error(e); process.exit(1); });
