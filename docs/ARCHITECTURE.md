# TaxTracker — Architecture Reference

This document describes the technical architecture of TaxTracker for developers onboarding to the project.

---

## Overview

TaxTracker is built on **Electron**, which runs two separate OS processes for every application window:

- **Main Process** — A Node.js process with full system access. Responsible for creating windows, managing the system tray, registering IPC handlers, and owning the data layer.
- **Renderer Process** — A Chromium process that runs the React SPA. It has no direct Node.js or filesystem access; it communicates with the main process exclusively through the IPC bridge.

This two-process model isolates the UI from privileged operations and is enforced by Electron's `contextIsolation` security flag.

---

## Process Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS                             │
│                         (main.js)                               │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │ BrowserWindow│   │  System Tray │   │   IPC Handlers       │ │
│  │  lifecycle   │   │  + Autostart │   │  (ipcMain.handle)    │ │
│  └─────────────┘   └──────────────┘   └──────────┬───────────┘ │
│                                                   │             │
│                                        ┌──────────▼───────────┐ │
│                                        │   DatabaseManager    │ │
│                                        │   (database.js)      │ │
│                                        └──────────┬───────────┘ │
│                                                   │             │
│                                        ┌──────────▼───────────┐ │
│                                        │  JSON Files on Disk  │ │
│                                        │  invoices.json       │ │
│                                        │  fxrates.json        │ │
│                                        └──────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    Electron IPC (contextBridge)
                    preload.js → window.api
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      RENDERER PROCESS                           │
│                    (Chromium + React 18)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  App.js — Ant Design Layout + react-router-dom v6        │  │
│  │                                                          │  │
│  │  /              → Dashboard.js   (charts, VAT totals)    │  │
│  │  /invoices      → InvoiceList.js (table, Excel export)   │  │
│  │  /invoices/new  → InvoiceForm.js (create invoice)        │  │
│  │  /invoices/edit/:id → InvoiceForm.js (edit invoice)      │  │
│  │  /fx-rates      → FxRates.js    (exchange rate mgmt)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Main Process (`main.js`)

### Responsibilities

| Responsibility | Details |
|---|---|
| **BrowserWindow lifecycle** | Creates a 1200×800 window with `contextIsolation: true` and `nodeIntegration: false`. In dev mode loads `http://localhost:3000`; in production loads `build/index.html` from the ASAR bundle. |
| **Window hide on close** | The window's `close` event is intercepted — the window is hidden rather than destroyed, so the app persists in the tray. |
| **System tray** | Built using Electron's `Tray` API (production only). Tray menu provides: Open window, Toggle autostart, Quit. |
| **Windows autostart** | Implemented by writing / removing a `.lnk` shortcut in the Windows `Startup` folder (`shell:startup`). No registry keys are used. |
| **DatabaseManager init** | Instantiates `DatabaseManager` from `database.js` early in the `app.whenReady()` callback so it is available to all IPC handlers. |
| **IPC handler registration** | Registers all `ipcMain.handle(channel, handler)` calls that the renderer can invoke via `window.api`. Each handler delegates to `DatabaseManager`. |

### IPC Channels (ipcMain)

| Channel | Handler |
|---|---|
| `get-invoices` | `db.getInvoices(filters)` |
| `add-invoice` | `db.addInvoice(invoice)` |
| `update-invoice` | `db.updateInvoice(id, invoice)` |
| `delete-invoice` | `db.deleteInvoice(id)` |
| `get-fx-rates` | `db.getFxRates(year, month)` |
| `add-fx-rate` | `db.addFxRate(fxRate)` |
| `update-fx-rate` | `db.updateFxRate(id, fxRate)` |
| `delete-fx-rate` | `db.deleteFxRate(id)` |
| `get-dashboard-data` | `db.getDashboardData(filters)` |

---

## Renderer Process

The renderer is a standard React 18 single-page application. It has **no Node.js access** — filesystem, native modules, and Electron APIs are all out of scope here. All privileged operations go through `window.api`.

### Key libraries

| Library | Role |
|---|---|
| React 18 | Component model, hooks, state management |
| react-router-dom v6 | Client-side routing (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useParams`) |
| Ant Design 5 | UI components (Layout, Menu, Table, Form, DatePicker, Select, Modal, etc.) |
| Chart.js + react-chartjs-2 | Bar and pie charts on the Dashboard |
| dayjs | Date parsing, formatting, and manipulation |
| xlsx (SheetJS) | Client-side Excel file generation for invoice export |

### Route Tree

```
App.js  (Ant Design Layout wrapper)
├── /              → <Dashboard />
├── /invoices      → <InvoiceList />
├── /invoices/new  → <InvoiceForm />  (create mode)
└── /invoices/edit/:id → <InvoiceForm />  (edit mode)
    /fx-rates      → <FxRates />
```

---

## IPC Bridge (`preload.js`)

### Why contextBridge?

Electron's security model requires `contextIsolation: true`, which means the renderer's `window` object and the Node.js global are in separate JavaScript contexts. The preload script runs in a privileged context with access to both, but `contextBridge.exposeInMainWorld` is the only safe way to pass values from the preload context into the renderer's `window` without granting full Node.js access to the page.

### `window.api` surface

The preload script exposes a single `window.api` object. Every method wraps an `ipcRenderer.invoke(channel, ...args)` call and returns a Promise.

```js
// Approximate shape of window.api
window.api = {
  getInvoices:      (filters?)        => Promise<Invoice[]>
  addInvoice:       (invoice)         => Promise<Invoice>
  updateInvoice:    (id, invoice)     => Promise<Invoice>
  deleteInvoice:    (id)              => Promise<{ id }>
  getFxRates:       (year?, month?)   => Promise<FxRate[]>
  addFxRate:        (fxRate)          => Promise<FxRate>
  updateFxRate:     (id, fxRate)      => Promise<FxRate>
  deleteFxRate:     (id)              => Promise<{ id, hasInvoices, invoiceCount }>
  getDashboardData: (filters?)        => Promise<DashboardData>
}
```

Renderer components call these methods directly, e.g.:

```js
const invoices = await window.api.getInvoices({ currency: 'USD' });
```

---

## Data Layer (`database.js`)

### DatabaseManager class

`DatabaseManager` is a plain JavaScript class instantiated once in the main process. It is the sole owner of the data files.

### Storage location

Data files are stored in Electron's `userData` path, which resolves to:

- **Windows:** `%APPDATA%\tax-tracker\taxtracker-data\`
- **macOS:** `~/Library/Application Support/tax-tracker/taxtracker-data/`

On first launch, `DatabaseManager` creates the directory and initialises empty `invoices.json` and `fxrates.json` files if they do not exist.

### In-memory arrays

At startup, both JSON files are read and parsed into in-memory arrays (`this.invoices`, `this.fxRates`). All read operations query the in-memory arrays; all write operations mutate the arrays and then flush the entire array back to disk as formatted JSON. This keeps the implementation simple at the cost of not being suitable for very large datasets.

### Path resolution (dev vs. production)

In development, `app.getPath('userData')` returns a path under the Electron executable's development data directory. In production (ASAR bundle), it returns the correct `%APPDATA%` path. `DatabaseManager` relies on `app.getPath('userData')` exclusively, so no manual path switching is needed.

### ID generation

New records receive a string `id` generated from `Date.now()` combined with a short random suffix (e.g., `Date.now().toString(36) + Math.random().toString(36).slice(2)`). This is sufficient for a single-user local application where no global uniqueness is required.

### Invoice filtering (`getInvoices`)

The `getInvoices` method accepts an optional filters object and applies JavaScript `Array.filter` over the in-memory array. Supported filters:

| Filter key | Behaviour |
|---|---|
| `startDate` | Inclusive lower bound on `invoice.date` |
| `endDate` | Inclusive upper bound on `invoice.date` |
| `company` | Case-insensitive substring match |
| `currency` | Exact match (`TRY` / `USD` / `EUR`) |
| `invoice_type` | Exact match (`Alış` / `Satış`) |

### FX rate upsert (`addFxRate`)

Because only one rate record per month/year combination is meaningful, `addFxRate` checks whether a record already exists for the given `year`+`month` before inserting. If one exists, it updates the record in place (upsert behaviour).

### Dashboard aggregation (`getDashboardData`)

`getDashboardData` is the most complex read operation. It applies the same optional date/type filters as `getInvoices`, then computes:

- **`vatByMonth`** — Summed VAT amounts (TRY equivalent) grouped by `YYYY-MM`
- **`currencyDistribution`** — Count of invoices per currency
- **`monthlyTotals`** — Subtotal, VAT, and total (TRY equivalent) grouped by month
- **`rawInvoices`** — The filtered invoice array (used by the Dashboard for further client-side processing if needed)

---

## Component Architecture

### `App.js`

The React root component. Renders a fixed Ant Design `Layout` with a top `Header` containing the navigation `Menu`. The `Menu` items use `useNavigate` for programmatic routing. The `Content` area renders the active `<Route>` via a `<Routes>` block.

### `Dashboard.js`

- On mount, calls `window.api.getDashboardData(filters)` and stores the response in local state.
- Renders three Chart.js charts: monthly VAT bar chart, currency distribution pie chart, and a monthly revenue summary as an Ant Design `Table`.
- Supports date-range and invoice-type filter controls that re-fetch data on change.

### `InvoiceList.js`

- Fetches all invoices via `window.api.getInvoices(filters)`.
- Displays results in an Ant Design `Table` with column sorting.
- Filter controls: date range, company name, currency, invoice type.
- A TRY totals summary (subtotal, VAT, total) is computed client-side from the filtered results and displayed above the table.
- **Excel export** — Uses the `xlsx` library to build a workbook from the current filtered data and triggers a browser download.
- Edit and delete actions per row; delete shows a confirmation modal.

### `InvoiceForm.js`

- Operates in two modes determined by the presence of `:id` in the route: **create** (`/invoices/new`) and **edit** (`/invoices/edit/:id`).
- In edit mode, fetches the existing invoice and pre-populates the Ant Design `Form`.
- Currency selection (`TRY` / `USD` / `EUR`) triggers a lookup of the monthly FX rate for the selected invoice date. If a rate exists, the TRY equivalent fields are calculated automatically.
- A **manual total toggle** allows the user to override the calculated TRY total with a custom value.
- On submit, calls either `window.api.addInvoice` or `window.api.updateInvoice`.

### `FxRates.js`

- Fetches all FX rates via `window.api.getFxRates()` and displays them in a table grouped by year.
- Year selector allows browsing historical rates (range: 2025–2030).
- **Average calculator** — A modal with three input fields; the user enters up to three rate observations and the modal computes and prefills the average into the rate form.
- Saving calls `window.api.addFxRate` (which upserts) or `window.api.updateFxRate`.
- Deleting a rate that has associated invoices shows a warning with the invoice count before confirming.

---

## Data Flow

The following trace covers a typical user action end-to-end:

```
1. User clicks "Save" on InvoiceForm
       │
2. React component calls:
       window.api.addInvoice(invoiceData)
       │
3. preload.js contextBridge forwards to:
       ipcRenderer.invoke('add-invoice', invoiceData)
       │
       [crosses process boundary via Electron IPC]
       │
4. main.js ipcMain.handle('add-invoice', ...) receives the call
       │
5. Handler calls:
       db.addInvoice(invoiceData)   // db = DatabaseManager instance
       │
6. DatabaseManager.addInvoice():
       a. Generates a new unique id
       b. Pushes the record onto this.invoices[]
       c. Writes the updated array to invoices.json (fs.writeFileSync)
       d. Returns the new invoice object
       │
7. Return value travels back:
       ipcMain handler → ipcRenderer.invoke resolves → window.api.addInvoice resolves
       │
8. React component receives the new invoice object
       │
9. Component navigates to /invoices via useNavigate()
```

---

## System Tray & Autostart

### System Tray

The tray is only created in production mode (`app.isPackaged === true`). In development, Electron loads the app from the React dev server and the tray is skipped to avoid orphaned tray icons during hot reloads.

Steps:
1. A `Tray` instance is created with a `.ico` file from the app's resources.
2. A `contextMenu` with three items is built: **Open**, **Toggle Autostart**, **Quit**.
3. The tray icon's `click` event shows the main window.

The window's `close` event calls `event.preventDefault()` and `mainWindow.hide()` instead of allowing the window to close. `app.on('before-quit')` sets a flag that allows a real quit when triggered from the tray menu.

### Windows Autostart

Autostart is implemented by placing a `.lnk` shortcut in the user's Windows Startup folder:

- **Path:** `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TaxTracker.lnk`
- **Enable:** Create the shortcut pointing to the installed `.exe` using Node's `ws` (shell link) or Electron's `app.setLoginItemSettings` — the implementation writes the shortcut using a helper.
- **Disable:** Delete the shortcut file.

The tray menu's "Toggle Autostart" item checks whether the shortcut file exists and creates or removes it accordingly. No registry keys are modified.

---

## Build Pipeline

```
npm run build
      │
      ├─ 1. react-scripts build
      │        Compiles src/ → build/
      │        Minifies JS/CSS, hashes asset filenames
      │
      ├─ 2. postbuild (copy-files.js / build-fresh.js)
      │        Copies main.js, preload.js, database.js, assets/
      │        into the build output directory so electron-builder
      │        can find all entry points in one place
      │
      └─ 3. electron-builder (electron-builder.yml)
               Reads build/ as the app source
               Bundles into an ASAR archive
               Produces: release/Tax Tracker-Setup-{version}.exe
               Installer type: NSIS (one-click Windows installer)
               appId: com.taxtracker.app
```

### electron-builder.yml key settings

| Setting | Value |
|---|---|
| `appId` | `com.taxtracker.app` |
| `productName` | `Tax Tracker` |
| `output` | `release/` |
| `asar` | `true` |
| `win.target` | `nsis` |
| `nsis.oneClick` | `true` (default one-click install) |

### Development vs. Production path differences

| Aspect | Development | Production |
|---|---|---|
| React app URL | `http://localhost:3000` | `file://build/index.html` (inside ASAR) |
| System tray | Disabled | Enabled |
| userData path | Electron dev userData dir | `%APPDATA%\tax-tracker\...` |
| DevTools | Opened automatically | Closed |
