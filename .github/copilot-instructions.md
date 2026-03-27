# Copilot Instructions – TaxTracker

## Project Overview

TaxTracker is a Turkish-language desktop app for invoice recording and VAT (KDV) tracking. Built with **Electron 22 + React 18 + Ant Design 5**. Data is persisted as JSON files (no SQL database).

---

## Commands

```bash
npm run dev          # Start React dev server (port 3000) + Electron together — use this for development
npm start            # Start Electron only (requires pre-built React app in build/)
npm run react-build  # Build React production bundle
npm run build        # Full production build → release/ directory (runs prebuild + react-build + postbuild)
npm run clean        # Remove dist/ and release/ output directories
```

There are no test or lint scripts.

---

## Architecture

```
main.js (Electron main process)
  └─ Manages BrowserWindow, system tray, and all IPC handlers
  └─ Calls database.js directly (same process)

preload.js (IPC bridge)
  └─ Exposes window.api to renderer using contextBridge

src/ (React renderer process)
  └─ Communicates exclusively via window.api calls

database.js (JSON file storage, runs in main process)
  └─ Loads data into memory on startup; persists to JSON on every write
  └─ Production data path: %APPDATA%\Tax Tracker\taxtracker-data\
  └─ Dev data path:        %APPDATA%\Electron\taxtracker-data\
```

**Dev vs. production loading** — `main.js` detects `isDev` by checking `process.defaultApp` or the Electron executable path, then loads `http://localhost:3000` in dev and `file://build/index.html` in production.

**Window close behavior** — The window hides to the system tray instead of quitting. The app only fully exits via the tray context menu (`isQuitting` flag in `main.js`).

---

## IPC Pattern

All renderer ↔ main communication goes through three files in a fixed pattern:

**1. Add handler in `main.js`:**
```javascript
ipcMain.handle('channel-name', async (event, params) => {
  try {
    return db.someMethod(params);
  } catch (error) {
    console.error('Error in channel-name:', error);
    throw error;
  }
});
```

**2. Expose via `preload.js`:**
```javascript
contextBridge.exposeInMainWorld('api', {
  methodName: (params) => ipcRenderer.invoke('channel-name', params),
});
```

**3. Call from React:**
```javascript
const result = await window.api.methodName(params);
```

Always check `if (!window.api)` at component mount (guards against running outside Electron).

---

## React Component Conventions

```javascript
import React, { useState, useEffect } from 'react';
import { message } from 'antd';

const MyPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!window.api) { message.error('API not available'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await window.api.getInvoices(filters);
      setData(result);
    } catch (error) {
      console.error('Error:', error);
      message.error('Hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return <div>...</div>;
};

export default MyPage;
```

- User-facing messages use `message.success()` / `message.error()` / `message.warning()` (Ant Design).
- Dates are handled with **dayjs**. Display format is `DD/MM/YYYY` (Turkish).
- Currency amounts are formatted to 2 decimal places. Invoices in USD/EUR always store a `try_equivalent` object alongside the original amounts.

---

## Data Models

**Invoice** (`invoices.json`):
```javascript
{
  id,            // auto-incremented integer
  date,          // "YYYY-MM-DD"
  company,       // string
  invoice_no,    // string
  subtotal,      // number (before VAT)
  vat_rate,      // number (0–20)
  vat_amount,    // number
  total,         // subtotal + vat_amount
  currency,      // "TRY" | "USD" | "EUR"
  invoice_type,  // "Alış" (purchase) | "Satış" (sale)
  description,   // optional string
  try_equivalent: { subtotal, vat_amount, total }  // only for USD/EUR
}
```

**FX Rate** (`fxrates.json`):
```javascript
{ id, year, month, usd_to_try, eur_to_try }
```

---

## Adding Features

**New invoice field:**
1. `database.js` — add to schema/migration in `loadData()` and update query/save logic
2. `InvoiceForm.js` — add form field with validation
3. `InvoiceList.js` — add table column
4. No IPC changes needed unless adding a new API method

**New page:**
1. Create `src/pages/NewPage.js`
2. Add `<Route>` in `App.js`
3. Add `<Menu.Item>` in the header menu in `App.js`

**New IPC method:** follow the 3-step IPC pattern above (main.js → preload.js → React).

---

## Key Libraries

| Library | Usage |
|---|---|
| `antd` v5 | All UI components (forms, tables, layout, charts) |
| `react-router-dom` v6 | `HashRouter` (required for `file://` protocol) |
| `dayjs` | Date parsing and formatting |
| `xlsx` | Excel export in InvoiceList |
| `chart.js` + `react-chartjs-2` | Charts on Dashboard |
| `electron-builder` | Packaging → `release/` NSIS installer |

## Notes: 
- Be concise when explaining something to developer.
- Use sub-agents when needed for parallel development to speed up the process.
- If have any question or uncertainty, ask developer first for verification or brainstroming.