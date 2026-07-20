# Cobalt — Web

Marketing site for the Cobalt Windows maintenance app.

## Dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Fill in before shipping

- `lib/constants.ts` → set `GITHUB_URL` to the real repo
- `public/downloads/Cobalt-Setup.exe` → drop the actual installer here (or change `DOWNLOAD_URL` to a hosted URL)
- Optional: replace `public/preview.png` with a cleaner app screenshot

## Build

```bash
npm run build
npm start
```
