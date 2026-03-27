# TaxTracker

> A desktop application for Turkish businesses to track invoices and VAT (KDV) obligations.

**Status:** Active | **Platform:** Windows (primary) | **License:** MIT

---

## Overview

TaxTracker is an Electron-based desktop application designed for Turkish freelancers and small businesses who need to manage their purchase (Alış) and sales (Satış) invoices and monitor VAT (KDV) exposure over time. All data is stored locally — no cloud, no subscriptions.

**Key capabilities:**

- Record and manage invoices in TRY, USD, or EUR with automatic TRY conversion
- Maintain monthly USD→TRY and EUR→TRY exchange rates with a built-in averaging tool
- Visualise monthly VAT totals, revenue trends, and currency distribution on a dashboard
- Export filtered invoice lists to Excel (.xlsx)
- Runs silently in the Windows system tray between sessions

---

## Features

- **Invoice CRUD** — Create, view, edit, and delete invoices with full field validation
- **Purchase & Sales types** — Separate Alış (purchase) and Satış (sale) invoice tracking
- **Multi-currency support** — Enter amounts in TRY, USD, or EUR; TRY equivalents are stored automatically using the active monthly FX rate
- **Manual total override** — Optionally set a custom TRY total instead of using the calculated conversion
- **FX rate management** — Store one USD→TRY and EUR→TRY rate per month; a three-value average calculator assists in setting accurate rates
- **Dashboard analytics** — Monthly VAT bar chart, currency distribution pie chart, and monthly revenue summary table powered by Chart.js
- **Excel export** — Export the current filtered invoice view to a formatted .xlsx file via the Invoice List page
- **System tray integration** — Application minimises to the tray on window close and can be reopened or quit from the tray icon (production only)
- **Windows autostart** — Optional autostart on login via a shortcut placed in the Windows Startup folder

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Electron | 22 | Desktop shell, IPC, tray, autostart |
| React | 18 | Renderer-process UI framework |
| Ant Design | 5 | UI component library |
| Chart.js + react-chartjs-2 | latest | Dashboard charts |
| react-router-dom | 6 | Client-side routing |
| dayjs | latest | Date formatting and manipulation |
| xlsx (SheetJS) | latest | Excel export |
| electron-builder | latest | Packaging and NSIS installer |
| concurrently | latest | Parallel dev server + Electron launch |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Windows** 10/11 (recommended; macOS works for development but tray/autostart features are Windows-only)

### Installation

```bash
git clone <repository-url>
cd TaxTracker
npm install
```

### Run in Development Mode

Starts the React dev server and Electron concurrently. Electron waits for port 3000 before opening.

```bash
npm run dev
```

### Run Electron Only (pre-built React required)

If the React app has already been built into `build/`:

```bash
npm start
```

---

## Project Structure

```
TaxTracker/
├── main.js                  # Electron main process — BrowserWindow, tray, IPC handlers
├── preload.js               # IPC bridge — exposes window.api to the renderer via contextBridge
├── database.js              # Data layer — DatabaseManager class, JSON file read/write
├── package.json
├── electron-builder.yml     # Packaging config — NSIS installer, ASAR, output to release/
├── build-fresh.js           # Helper script used during the production build pipeline
├── StartTaxTracker.bat      # Convenience launcher batch file
│
├── src/                     # React application (renderer process)
│   ├── App.js               # App shell — Ant Design Layout, nav menu, react-router routes
│   ├── pages/
│   │   ├── Dashboard.js     # Charts, VAT totals, revenue stats
│   │   ├── InvoiceList.js   # Filterable invoice table, Excel export
│   │   ├── InvoiceForm.js   # Create / edit invoice form, currency conversion
│   │   └── FxRates.js       # Monthly FX rate management, average calculator
│   └── ...
│
├── public/                  # Static assets served by React dev server / copied to build
├── docs/                    # Project documentation
│   ├── README.md            # This file
│   └── ARCHITECTURE.md      # Technical architecture reference
│
└── scripts/                 # Build-time helper scripts (e.g., copy-files.js)
```

---

## Data Storage

TaxTracker stores all data as plain JSON files on the local filesystem. No database server is required.

| Platform | Data directory |
|---|---|
| Windows | `%APPDATA%\tax-tracker\taxtracker-data\` |
| macOS | `~/Library/Application Support/tax-tracker/taxtracker-data/` |

**Files:**

| File | Contents |
|---|---|
| `invoices.json` | Array of all invoice records |
| `fxrates.json` | Array of monthly USD→TRY and EUR→TRY exchange rates |

Both files are created automatically on first launch if they do not exist. Back them up by copying this directory.

---

## Building & Distributing

### Full Production Build

Runs the React build, copies output files to the Electron working directory, then packages with electron-builder:

```bash
npm run build
```

Output is placed in `release/`:

```
release/
└── Tax Tracker-Setup-{version}.exe   # NSIS Windows installer
```

### Portable ZIP

```bash
npm run make-portable
```

### Clean Build Artifacts

```bash
npm run clean
```

### Build Details

1. `react-scripts build` compiles the React app into `build/`
2. `postbuild` script (`copy-files.js`) copies necessary files into place
3. `electron-builder` packages the app using `electron-builder.yml` config
   - `appId`: `com.taxtracker.app`
   - ASAR archiving enabled
   - Target: NSIS installer for Windows

---

## Known Limitations

- **Year range** — FX rate and dashboard year selectors are limited to **2025–2030**
- **Currencies** — Only TRY, USD, and EUR are supported; no other currency codes
- **Platform** — System tray and Windows autostart features are **Windows-only**; the app can run on macOS for development but those features will be inactive
- **Local storage only** — There is no sync, backup, or multi-device support built in
- **No authentication** — The app assumes single-user, local use; there is no login or access control

---

## License

MIT License — see `LICENSE` for details.
