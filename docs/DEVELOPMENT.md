# TaxTracker — Developer Guide

A practical reference for developers working on TaxTracker, a Turkish invoice (fatura) and VAT (KDV) tracking desktop app built with Electron + React.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start](#2-quick-start)
3. [Development Workflow](#3-development-workflow)
4. [Project Structure](#4-project-structure)
5. [npm Scripts Reference](#5-npm-scripts-reference)
6. [How `isDev` is Detected](#6-how-isdev-is-detected)
7. [Data in Development](#7-data-in-development)
8. [Building for Production](#8-building-for-production)
9. [Build Output](#9-build-output)
10. [Scripts Folder Reference](#10-scripts-folder-reference)
11. [Adding New Pages](#11-adding-new-pages)
12. [Adding New IPC Channels](#12-adding-new-ipc-channels)
13. [Debugging](#13-debugging)
14. [Known Dev Issues](#14-known-dev-issues)

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | LTS v18 or v20 (recommended) | v20+ preferred; see [Known Dev Issues](#14-known-dev-issues) for caveats |
| **npm** | Comes with Node.js | v9+ recommended |
| **Git** | Any recent version | — |
| **Windows** | Windows 10/11 | Required for full feature testing (NSIS installer, system tray, autostart) |

> **macOS/Linux:** The app runs on macOS and Linux, but the installer target is Windows NSIS. Tray behavior and the autostart feature are Windows-specific.

---

## 2. Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd TaxTracker

# 2. Install dependencies
npm install

# 3. Start in development mode
npm run dev
```

`npm run dev` will:
- Start the React dev server on `http://localhost:3000`
- Wait until the dev server is ready
- Launch the Electron window pointing at `http://localhost:3000`

You should see the app window open within a few seconds.

---

## 3. Development Workflow

### How dev mode works

```
npm run dev
  ├─ react-scripts start  →  React dev server on :3000  (hot reload enabled)
  └─ wait-on :3000 → electron .  →  Electron loads http://localhost:3000
```

- **`concurrently`** runs both processes in the same terminal with labeled output (`[0]` React, `[1]` Electron).
- **`wait-on`** polls `http://localhost:3000` until it responds, then starts Electron. This prevents Electron from launching before React is ready.
- **`cross-env BROWSER=none`** suppresses the default CRA behaviour of opening a browser tab.

### Hot reload

React hot module replacement (HMR) is active via `react-scripts`. Changes to files under `src/` reload automatically in the Electron window — **no manual restart needed**.

Changes to `main.js`, `preload.js`, or `database.js` require a **manual restart** of `npm run dev`, because those files run in the Electron main process which is not watched.

### React DevTools

In dev mode, Electron loads from `localhost:3000`, so you can install the **React Developer Tools** Chrome extension to the Chromium instance embedded in Electron:

1. Open DevTools in the Electron window: `Ctrl+Shift+I` (or `F12`).
2. Go to the **Console** tab and run:
   ```js
   require('electron').remote  // not available in this app, but DevTools itself works
   ```
3. For full React DevTools, install the standalone version:
   ```bash
   npm install -g react-devtools
   react-devtools
   ```
   Then in `main.js` (temporarily) add `require('react-devtools')` before `app.whenReady()`.

### System tray

The system tray icon is **skipped in dev mode**. You will not see a tray icon while running `npm run dev`. Tray functionality can only be tested in a production build.

---

## 4. Project Structure

```
TaxTracker/
├── main.js                  # Electron main process — window, tray, IPC handlers
├── preload.js               # Context bridge — exposes safe API to renderer
├── database.js              # Data layer — JSON file CRUD + filtering
├── electron-builder.yml     # Packaging config (NSIS, ASAR, targets)
├── package.json
├── icon.ico                 # App icon (root copy, used by tray in dev fallback)
│
├── src/                     # React application (CRA)
│   ├── App.js               # Root component — router, layout, navigation menu
│   ├── index.js             # React entry point
│   ├── index.css            # Global styles
│   └── pages/
│       ├── Dashboard.js     # Analytics: charts, VAT summaries, totals
│       ├── InvoiceList.js   # Invoice table, filters, Excel export
│       ├── InvoiceForm.js   # Create / edit invoice form
│       └── FxRates.js       # Exchange rate management
│
├── public/                  # CRA public assets (favicon, index.html template)
│
├── scripts/                 # Build helper scripts (Node.js, not part of the app)
│   ├── copy-files.js        # Copies Electron files into build/ after react-build
│   ├── clean.js             # Removes build artifacts before a fresh build
│   ├── autostart-setup.js   # Creates/removes Windows Startup shortcut
│   ├── build-fresh.js       # Full clean + build helper
│   └── create-icon.js       # Generates icon.ico from PNG
│
├── docs/                    # Documentation
│
├── build/                   # Generated — React build + copied Electron files
│                            # (Do not edit manually; regenerated on each build)
└── release/                 # Generated — Final NSIS installer / zip
                             # (Do not commit; listed in .gitignore)
```

---

## 5. npm Scripts Reference

| Script | Command | What it does | When to use |
|--------|---------|-------------|-------------|
| `dev` | `concurrently "cross-env BROWSER=none npm run react-start" "wait-on http://localhost:3000 && electron ."` | Starts React dev server + Electron together | **Primary development command** |
| `react-start` | `react-scripts start` | Starts React dev server only (port 3000) | When you want just the React hot-reload server |
| `start` | `electron .` | Launches Electron only | After a manual `react-build`; rarely used directly |
| `react-build` | `react-scripts build` | Compiles React app into `build/` | Part of the full build; rarely called alone |
| `postbuild` | `node scripts/copy-files.js` | Copies `main.js`, `preload.js`, `database.js` into `build/` | Runs automatically after `react-build` |
| `clean` | `node scripts/clean.js` | Deletes `dist/` and `release/` | Before a fresh build; runs automatically via `prebuild` |
| `prebuild` | `npm run clean` | Runs `clean` before `build` | Runs automatically before `build` |
| `build` | `npm run react-build && npm run postbuild && electron-builder --config electron-builder.yml` | Full production build → NSIS installer | **Release builds** |
| `make-portable` | `npm run react-build && npm run postbuild && electron-forge make --targets=@electron-forge/maker-zip` | Builds a portable ZIP instead of an installer | Distributing without an installer |

---

## 6. How `isDev` is Detected

```js
// main.js, line 3
const isDev = process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath);
```

| Condition | Meaning |
|-----------|---------|
| `process.defaultApp` | Set by Electron when launched via `electron .` from the project root |
| `process.execPath` matches `node_modules/electron/` | Electron binary is the local dev-installed package, not a packaged executable |

### Implications

- **Dev mode (`isDev = true`):** Electron loads `http://localhost:3000`. System tray is **not** created.
- **Production mode (`isDev = false`):** Electron loads `file://${__dirname}/build/index.html`. System tray **is** created with `icon.ico`.

> **Note:** The `electron-is-dev` package is listed as a dependency but is **not used**. The app uses its own detection logic above.

---

## 7. Data in Development

### Storage paths

| Mode | Data directory |
|------|---------------|
| **Development** | `%APPDATA%\Electron\taxtracker-data\` |
| **Production** | `%APPDATA%\tax-tracker\taxtracker-data\` |

These paths are resolved by `app.getPath('userData')` + `/taxtracker-data/`, which Electron sets differently for packaged vs. unpackaged apps.

### Data files

```
taxtracker-data/
├── invoices.json   # Array of invoice objects
└── fxrates.json    # Array of FX rate objects
```

Both files are pretty-printed JSON (`JSON.stringify(data, null, 2)`).

### Migration on first production run

When a production build is launched for the first time and the production data directory does not yet exist, `database.js` checks for dev data and migrates it automatically:

1. Check if `%APPDATA%\tax-tracker\taxtracker-data\` exists.
2. If not, check if `%APPDATA%\Electron\taxtracker-data\` (dev path) exists.
3. If dev data is found, copy `invoices.json` and `fxrates.json` to the production path.
4. If neither exists, create an empty production data directory.

This means your development data carries over to the first production install automatically.

---

## 8. Building for Production

Run the full build with:

```bash
npm run build
```

This executes three sequential phases:

### Phase 1 — Clean (`prebuild` → `scripts/clean.js`)

Removes `dist/` and `release/` to ensure a clean state. Preserves `build/static/` (React's compiled JS/CSS bundles) using a copy-restore mechanism to avoid re-running the slow React compile if those files are current.

### Phase 2 — React compile (`react-build` → `react-scripts build`)

Compiles the React app into `build/`:
- Bundles and minifies all JS/CSS.
- Outputs `build/index.html`, `build/static/js/`, `build/static/css/`, etc.
- Uses `"homepage": "./"` in `package.json` so asset paths are relative (required for Electron `file://` loading).
- `browserslist` targets `last 1 electron version` so the output is optimised for the bundled Chromium.

### Phase 3 — Copy Electron files (`postbuild` → `scripts/copy-files.js`)

Copies the Electron-side files into `build/` so `electron-builder` can bundle everything from a single directory:

- `main.js` → `build/main.js`
- `preload.js` → `build/preload.js`
- `database.js` → `build/database.js`
- `public/favicon.ico` → `build/favicon.ico` and `build/icon.ico`
- `scripts/autostart-setup.js` → `build/scripts/autostart-setup.js`
- Creates a minimal `build/package.json` with `"main": "main.js"` for Electron's entry point.

### Phase 4 — Package (`electron-builder`)

Reads `electron-builder.yml` and creates the NSIS installer in `release/`:

- Bundles `build/**/*` into an ASAR archive.
- Signs nothing by default (no code-signing cert configured).
- Produces `release/Tax Tracker-Setup-1.0.0.exe`.

---

## 9. Build Output

### `build/` directory (intermediate)

After `npm run react-build && npm run postbuild`:

```
build/
├── index.html
├── static/
│   ├── js/          # Bundled React app
│   └── css/         # Bundled styles
├── main.js          # Electron main process
├── preload.js       # Context bridge
├── database.js      # Data layer
├── package.json     # Minimal: { "main": "main.js" }
├── icon.ico         # App icon
├── favicon.ico
└── scripts/
    └── autostart-setup.js
```

### `release/` directory (final output)

After `electron-builder`:

```
release/
├── Tax Tracker-Setup-1.0.0.exe   # NSIS installer
└── win-unpacked/                  # Unpacked app (for testing without installing)
```

### NSIS installer behaviour

The installer (`Tax Tracker-Setup-1.0.0.exe`) will:
- Show a standard wizard (not one-click).
- Allow the user to choose the install directory.
- Create a **Desktop shortcut** and a **Start Menu entry**.
- Launch the app automatically after installation completes.
- **Not** delete app data (`%APPDATA%\tax-tracker\`) on uninstall.

---

## 10. Scripts Folder Reference

All scripts in `scripts/` are plain Node.js. They are build tools, not part of the packaged app (except `autostart-setup.js`, which is copied into `build/`).

### `scripts/copy-files.js`

Called automatically by the `postbuild` npm hook. Prepares the `build/` directory for `electron-builder` by copying all Electron-side files that are not output by `react-scripts build`.

### `scripts/clean.js`

Deletes `dist/` and `release/`. Preserves `build/static/` with a copy-restore cycle so React's slow compile step can be skipped when only Electron files changed. Uses `rmdir /s /q` on Windows with a 3-attempt retry loop to handle locked files.

### `scripts/autostart-setup.js`

Manages the Windows Startup folder shortcut for auto-launching Tax Tracker on login.

**Exported functions:**

```js
setupWindowsAutostart()   // Creates shortcut in %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
removeWindowsAutostart()  // Deletes the shortcut
```

Both return `true` on success, `false` on error. They work by generating and executing a temporary VBScript (`.vbs`) file that uses `WScript.Shell` to create/remove the `.lnk` shortcut.

**CLI usage (for manual testing):**

```bash
node scripts/autostart-setup.js --install
node scripts/autostart-setup.js --uninstall
```

### `scripts/build-fresh.js`

Convenience script for a full clean + build in one command. Equivalent to `npm run build` but can be run directly with Node.

### `scripts/create-icon.js`

Converts a PNG source image to `icon.ico` using the `png-to-ico` package. Run this if you replace the app icon with a new PNG:

```bash
node scripts/create-icon.js
```

---

## 11. Adding New Pages

### Step 1 — Create the page component

Create `src/pages/MyNewPage.js`:

```jsx
import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

export default function MyNewPage() {
  return (
    <div>
      <Title level={2}>My New Page</Title>
    </div>
  );
}
```

### Step 2 — Add the route in `App.js`

Open `src/App.js`. Find the `<Routes>` block and add a new `<Route>`:

```jsx
import MyNewPage from './pages/MyNewPage';

// Inside <Routes>:
<Route path="/my-new-page" element={<MyNewPage />} />
```

### Step 3 — Add a navigation item

In `src/App.js`, find the `items` array passed to the Ant Design `<Menu>` component and add a new entry:

```jsx
import { SettingOutlined } from '@ant-design/icons';

// Inside the items array:
{
  key: '5',
  icon: <SettingOutlined />,
  label: <Link to="/my-new-page">My New Page</Link>,
},
```

> Use a unique `key` value. Browse `@ant-design/icons` for available icon names.

### Step 4 — Verify

Run `npm run dev`. The new item should appear in the navigation bar and clicking it should render your page.

---

## 12. Adding New IPC Channels

IPC (Inter-Process Communication) is how the React renderer talks to the Electron main process (e.g., to read/write data). The flow is:

```
React component
  → window.api.myNewChannel(args)    [preload.js]
    → ipcRenderer.invoke('my-new-channel', args)
      → ipcMain.handle('my-new-channel', handler)  [main.js]
        → database operation or OS call
          → returns result back through the chain
```

### Step 1 — Add the handler in `main.js`

Find the block of `ipcMain.handle` calls (around line 212) and add:

```js
ipcMain.handle('my-new-channel', async (event, arg1, arg2) => {
  try {
    const result = database.myNewOperation(arg1, arg2);
    return result;
  } catch (error) {
    console.error('my-new-channel error:', error);
    throw error;
  }
});
```

### Step 2 — Expose the function in `preload.js`

Find the `contextBridge.exposeInMainWorld('api', { ... })` call and add your function inside the object:

```js
myNewChannel: (arg1, arg2) => ipcRenderer.invoke('my-new-channel', arg1, arg2),
```

### Step 3 — Add the database method (if needed)

If the channel needs a new data operation, add it to `database.js`:

```js
myNewOperation(arg1, arg2) {
  // read/write this.invoices or this.fxRates
  // call this._saveInvoices() or this._saveFxRates() after writes
  return result;
}
```

### Step 4 — Call it from React

In any page component:

```js
const result = await window.api.myNewChannel(arg1, arg2);
```

Wrap in `try/catch` or use `.catch()` for error handling.

### Existing IPC channels

| Channel | Arguments | Returns |
|---------|-----------|---------|
| `get-invoices` | `filters` object | Array of invoice objects |
| `add-invoice` | `invoice` object | Created invoice object |
| `update-invoice` | `id`, `invoice` object | Updated invoice object |
| `delete-invoice` | `id` | `{ success: true }` |
| `get-fx-rates` | `year`, `month` | Array of FX rate objects |
| `add-fx-rate` | `fxRate` object | Created/upserted FX rate |
| `update-fx-rate` | `id`, `fxRate` object | Updated FX rate |
| `delete-fx-rate` | `id` | `{ id, hasInvoices, invoiceCount }` |
| `get-dashboard-data` | `filters` object | `{ vatByMonth, currencyDistribution, monthlyTotals, rawInvoices }` |

---

## 13. Debugging

### Open DevTools in dev mode

Press **`Ctrl+Shift+I`** (or **`F12`**) in the Electron window to open Chromium DevTools. This gives you:

- **Console** — `console.log` from React code appears here.
- **Sources** — Step through React source code with source maps.
- **Network** — Monitor IPC-related fetches (limited use in Electron).
- **React DevTools** — Available if installed as a Chrome extension in the embedded Chromium.

> DevTools only opens automatically in dev mode. In a production build you would need to add `win.webContents.openDevTools()` to `main.js` temporarily.

### Main process logs

`console.log` calls in `main.js`, `preload.js`, and `database.js` output to the **terminal** where you ran `npm run dev` — not to the Electron window's DevTools console.

Watch the terminal output for:
- IPC handler errors
- Database read/write errors
- Autostart setup results

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Electron launches but shows blank screen | React dev server not ready yet | Wait a few more seconds; `wait-on` should handle this, but slow machines may need extra time |
| `window.api is undefined` in React | `preload.js` not loading or `contextIsolation` mismatch | Check `webPreferences` in `main.js`; ensure `preload.js` path is correct |
| Changes to `main.js` not reflected | Main process isn't hot-reloaded | Stop `npm run dev` and restart it |
| Data not persisting between runs | Wrong data path | Check `%APPDATA%\Electron\taxtracker-data\` in Windows Explorer |
| `react-scripts` not found | `node_modules` missing or corrupted | Run `npm install` |
| Port 3000 already in use | Another process is using the port | Kill it (`netstat -ano \| findstr :3000`) or change the port (`set PORT=3001`) |
| Build fails with EPERM on Windows | File lock from a running Electron instance | Close the running app before running `npm run build` |

---

## 14. Known Dev Issues

### Electron 22 + Node.js 20 native module caveats

Electron 22 embeds **Node.js v16**. If you install native npm packages (compiled `.node` files) using Node.js 20 on your machine, they will be compiled against Node 20 ABI and **will not load inside Electron 22**.

Mitigations:
- Prefer pure-JS packages when possible.
- If a native module is needed, use `electron-rebuild` to recompile it against Electron's bundled Node version:
  ```bash
  npm install --save-dev electron-rebuild
  npx electron-rebuild
  ```

### `electron-is-dev` package — ignore

The `electron-is-dev` package is listed in `dependencies` but is **not imported or used anywhere** in the codebase. The app uses its own `isDev` detection (see [Section 6](#6-how-isdev-is-detected)). Do not use `electron-is-dev` in new code.

### `better-sqlite3` — not used

Older documentation or git history may reference `better-sqlite3`. This package is **not installed and not used**. All data storage is plain JSON files managed by `database.js`. Do not add `better-sqlite3` as a dependency unless you intend a full storage-layer migration.

### `@testing-library` — installed but no tests exist

Testing libraries (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`) are installed as dependencies but there are no test files in the project. `npm test` will launch the Jest watcher but find nothing to run.

### `electron-forge` — partially configured

`@electron-forge/cli` and `@electron-forge/maker-zip` are installed. The `make-portable` script uses Forge to produce a ZIP archive. The primary distribution target remains **electron-builder** (NSIS installer). The two tools coexist but only `electron-builder` is fully configured.
