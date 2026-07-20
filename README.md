<p align="center">
  <img src="cobaltbg.png" alt="Cobalt" width="140" />
</p>

<h1 align="center">Cobalt</h1>

<p align="center">
  Modern PC maintenance, driver management and optimization for Windows.
</p>

<p align="center">
  <a href="https://github.com/ensomg/Cobalt/releases/latest"><img src="https://img.shields.io/github/v/release/ensomg/Cobalt?color=1e90ff&label=latest" alt="latest release" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-1e90ff" alt="platform" />
  <img src="https://img.shields.io/badge/license-MIT-1e90ff" alt="license" />
</p>

---

Cobalt is a Windows-first control panel that brings driver updates, system tweaks, cleanup, bloatware removal and network tuning under one roof. Built on Electron, it stays out of the way and does the heavy lifting through native Windows tooling — no third-party scripts, no telemetry.

## Highlights

- **Driver updates** — surfaces pending updates from the Windows Update catalog and installs them silently, with a real progress feed.
- **Optimization** — a curated set of registry and service tweaks with revert support, presets and per-item status detection.
- **Bloatware & uninstaller** — remove pre-installed apps, browse installed programs by icon, and deep-clean leftovers after uninstall.
- **Cleanup** — reclaims disk space from temp folders, caches, Windows Update leftovers and prefetch, with a size preview before you commit.
- **Windows Defender** — granular toggles, presets and a full disable/enable path when you know what you are doing.
- **DNS & Power** — one-click DNS presets (Cloudflare, Google, Quad9, AdGuard…) with a ping table, plus power plans including Ultimate Performance.
- **App manager** — install, upgrade and uninstall software through `winget`, with live progress per package.
- **System dashboard** — CPU, RAM, disk and GPU stats with live counters.
- **Auto update** — the app checks GitHub Releases on launch and prompts to install a signed setup when a newer version is out.

## Install

Grab the latest installer from the [Releases](https://github.com/ensomg/Cobalt/releases/latest) page:

- `Cobalt-<version>-x64.exe` — installer (NSIS, per-user)
- `Cobalt-<version>-portable.exe` — portable build, no installation required

Cobalt requires administrator privileges for driver, registry and service operations. The app will prompt for elevation on demand.

## Build from source

```bash
git clone https://github.com/ensomg/Cobalt.git
cd Cobalt
npm install
npm start           # run in dev
npm run build       # build NSIS + portable
```

Output lands in `dist/`.

## Updates

Cobalt uses GitHub Releases as its update channel. On startup it reads
`api.github.com/repos/ensomg/Cobalt/releases/latest`, compares the tag with the
running version, and — if a newer build is available — shows a full-screen
update prompt with the download progress inline. To publish an update, tag a new
release (e.g. `v0.2.0`) and attach the `Cobalt-Setup-*.exe` asset.

## Project layout

```
main/        Electron main process modules (drivers, cleanup, defender, dns…)
renderer/    UI (HTML, CSS, vanilla JS pages)
web/         Marketing / download site (Next.js)
build/       Icons and installer assets
```

## Contributing

Issues and pull requests are welcome. If you are reporting a bug, include your
Windows build (`winver`) and, if relevant, the exit code or error message from
the in-app toast.

## License

Released under the [MIT License](LICENSE). © 2026 Enes.

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=ensomg/Cobalt&type=date&legend=top-left&sealed_token=gwCBM4P5ASC5-t8bLESu8sFE1En8-FSGlDPGlITCXULszapXhbcMRBhnbBGOEuIASA)](https://www.star-history.com/?repos=ensomg%2FCobalt&type=date&legend=top-left)

---

<p align="center">
  <sub>Read this in <a href="README.tr.md">Türkçe</a>.</sub>
</p>
