const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const distApp = path.join(root, 'dist', 'Cobalt-v0.1.0');
const stage = path.join(__dirname, 'stage');
const payloadDir = path.join(stage, 'payload');
const payloadZip = path.join(stage, 'payload.zip');

if (!fs.existsSync(distApp)) {
  console.error('Missing dist/Cobalt-v0.1.0. Run "node build.js" first.');
  process.exit(1);
}

console.log('Preparing stage folder...');
if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(payloadDir, { recursive: true });

function copyDir(src, dst) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); }
    else fs.copyFileSync(s, d);
  }
}

console.log('Copying app files...');
copyDir(distApp, payloadDir);
for (const junk of ['Run as Administrator.bat', 'README.txt']) {
  const p = path.join(payloadDir, junk);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log('Zipping payload (IExpress cannot preserve directories)...');
const zipRes = spawnSync('powershell.exe', [
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
  `Compress-Archive -Path "${payloadDir}\\*" -DestinationPath "${payloadZip}" -Force`,
], { stdio: 'inherit' });
if (zipRes.status !== 0) {
  console.error('Compress-Archive failed with code', zipRes.status);
  process.exit(1);
}
fs.rmSync(payloadDir, { recursive: true, force: true });

fs.copyFileSync(path.join(__dirname, 'install.ps1'), path.join(stage, 'install.ps1'));
fs.copyFileSync(path.join(__dirname, 'uninstall.ps1'), path.join(stage, 'uninstall.ps1'));

fs.writeFileSync(
  path.join(stage, 'install.bat'),
  '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"\r\npause\r\n',
  'ascii'
);

console.log('Creating self-extracting installer via IExpress...');
// IExpress is ANSI-only; the project path contains non-ASCII chars ("Yeni klasör"),
// so stage the SED + files in a plain-ASCII temp folder for iexpress to consume.
const tmpBuild = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'cobalt-iexpress');
if (fs.existsSync(tmpBuild)) fs.rmSync(tmpBuild, { recursive: true, force: true });
fs.mkdirSync(tmpBuild, { recursive: true });
for (const f of fs.readdirSync(stage)) {
  fs.copyFileSync(path.join(stage, f), path.join(tmpBuild, f));
}
const sedPath = path.join(tmpBuild, 'installer.sed');
const finalOut = path.join(root, 'dist', 'Cobalt-Setup-v0.1.0.exe');
if (fs.existsSync(finalOut)) fs.unlinkSync(finalOut);
const tmpOut = path.join(tmpBuild, 'CobaltSetup.exe');
if (fs.existsSync(tmpOut)) { try { fs.unlinkSync(tmpOut); } catch {} }
const outExe = tmpOut;

const allFiles = fs.readdirSync(tmpBuild).filter((f) => f !== 'installer.sed' && f !== 'CobaltSetup.exe');

const sed = `[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=${outExe}
FriendlyName=Cobalt v0.1.0 Setup
AppLaunched=cmd /c install.bat
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
${allFiles.map((f, i) => `FILE${i}="${f}"`).join('\r\n')}
[SourceFiles]
SourceFiles0=${tmpBuild}\\
[SourceFiles0]
${allFiles.map((_, i) => `%FILE${i}%=`).join('\r\n')}
`;

fs.writeFileSync(sedPath, sed);

console.log('Compiling with iexpress.exe...');
const result = spawnSync('iexpress.exe', ['/N', '/Q', 'installer.sed'], { stdio: 'inherit', cwd: tmpBuild });

if (result.status !== 0 || !fs.existsSync(outExe)) {
  console.error('IExpress failed with code', result.status);
  process.exit(1);
}

fs.mkdirSync(path.dirname(finalOut), { recursive: true });
fs.copyFileSync(outExe, finalOut);
try { fs.rmSync(tmpBuild, { recursive: true, force: true }); } catch {}

console.log('');
console.log('Installer created:', finalOut);
console.log('Size:', (fs.statSync(finalOut).size / 1024 / 1024).toFixed(1), 'MB');
