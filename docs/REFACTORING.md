# TaxTracker — Technical Debt & Refactoring Roadmap

## 1. Executive Summary

TaxTracker is a functional Electron + React desktop application, but it carries significant technical debt across every layer of the stack. The data layer relies on unprotected flat JSON files with no atomicity guarantee, meaning a crash mid-write can silently corrupt all stored data. The frontend has several UX bugs (broken navigation highlighting, missing form fields, stale FX calculations) and is cluttered with `console.log` statements. The toolchain is aging: Electron 22 is EOL, `react-scripts` (CRA) is in maintenance mode, and there is no TypeScript, no tests, and no linter configuration.

**Overall Severity: HIGH** — One critical data integrity issue (JSON atomicity) should be treated as a production blocker. Several high-priority bugs degrade everyday usability. The rest are medium/low quality-of-life improvements that should be addressed in subsequent sprints.

---

## 2. Priority Matrix

| Issue | Category | Priority | Effort |
|---|---|---|---|
| JSON storage has no atomicity — data corruption risk | Data Layer | 🔴 Critical | M |
| `try_equivalent` is stale after FX rate changes | Data Layer | 🔴 Critical | M |
| Electron 22 is EOL (security vulnerabilities) | Toolchain | 🔴 Critical | L |
| No input sanitization in IPC handlers | Security | 🔴 Critical | S |
| `isDev` detection ignores installed package | main.js | 🟠 High | S |
| Navigation active state always shows Dashboard | Frontend | 🟠 High | S |
| 15+ `console.log` calls left in production code | Frontend | 🟠 High | S |
| `description` field missing from InvoiceForm | Frontend | 🟠 High | S |
| Dashboard has no loading/error state | Frontend | 🟠 High | S |
| Year range hardcoded in FxRates (2025–2030) | Frontend | 🟡 Medium | S |
| VAT rates outdated (missing 1%, 8%; wrong 18%) | Frontend | 🟡 Medium | S |
| Incomplete `useEffect` dependency arrays | Frontend | 🟡 Medium | S |
| `fetchInvoice` loads all records to find one | Frontend | 🟡 Medium | S |
| No React Error Boundaries | Frontend | 🟡 Medium | S |
| Excel export saves to CWD with no path dialog | Frontend | 🟡 Medium | S |
| App logo shows "Ales" placeholder | Frontend | 🟡 Medium | S |
| No TypeScript | Architecture | 🟢 Low | L |
| Replace CRA with Vite | Toolchain | 🟢 Low | L |
| Add unit tests | Quality | 🟢 Low | L |
| i18n support | Feature | 🟢 Low | L |
| Window state persistence | UX | 🟢 Low | S |
| macOS/Linux autostart support | Feature | 🟢 Low | M |

---

## 3. Critical Issues

### 3.1 Data Integrity — JSON Storage Has No Atomicity

#### The Bug

`database.js` writes data with a plain `fs.writeFileSync`:

```js
// database.js (current)
saveData() {
  fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
}
```

If the process crashes, loses power, or is killed between the start and end of the write, the output file will be truncated or partially written — producing invalid JSON. The next launch will fail to parse it and all data will be lost. There is also no backup before overwrite.

#### Recommended Fix: Atomic Write Pattern (short-term)

Replace the direct write with a write-to-temp + rename strategy. On most OSes, `rename()` is atomic at the filesystem level:

```js
const os = require('os');
const path = require('path');

saveData() {
  const json = JSON.stringify(this.data, null, 2);
  const tmpPath = this.dataPath + '.tmp';
  fs.writeFileSync(tmpPath, json, 'utf8');
  fs.renameSync(tmpPath, this.dataPath);
}
```

Also add a backup before overwrite so a single bad save is recoverable:

```js
saveData() {
  if (fs.existsSync(this.dataPath)) {
    fs.copyFileSync(this.dataPath, this.dataPath + '.bak');
  }
  const json = JSON.stringify(this.data, null, 2);
  const tmpPath = this.dataPath + '.tmp';
  fs.writeFileSync(tmpPath, json, 'utf8');
  fs.renameSync(tmpPath, this.dataPath);
}
```

#### Recommended Fix: Migrate to better-sqlite3 (long-term)

The `KURULUM.md` installation guide already mentions SQLite as a dependency, yet the app never uses it. Migrating to `better-sqlite3` provides:

- Full ACID transactions
- Atomic writes by default
- No need for manual JSON serialization
- Dramatically better performance at scale
- Native support for data validation via schema constraints

**Migration path:**

1. **Install:** `npm install better-sqlite3`
2. **Create schema** in a new `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL,
  date TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  currency TEXT NOT NULL DEFAULT 'TRY',
  subtotal REAL NOT NULL,
  vat_rate REAL NOT NULL,
  vat_amount REAL,
  total REAL,
  description TEXT,
  try_equivalent REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fx_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  currency TEXT NOT NULL,
  month TEXT NOT NULL,
  rate REAL NOT NULL,
  UNIQUE(currency, month)
);
```

3. **Write a one-time migration script** (`scripts/migrate-json-to-sqlite.js`) that reads the existing `invoices.json` and `fxrates.json` and inserts all records into the new database.
4. **Replace `DatabaseManager`** class methods to use `better-sqlite3` prepared statements.
5. **Keep JSON files as backup** until migration is verified in production.

---

### 3.2 `try_equivalent` Staleness — Recalculation Bug

#### The Bug

When an invoice is saved, the FX-converted TRY equivalent is calculated once and stored:

```js
// database.js (current)
const rate = this.getFxRate(invoice.currency, invoiceMonth);
invoice.try_equivalent = rate ? invoice.total * rate : null;
```

If the user later updates the FX rate for that month (e.g., they entered the wrong rate), **existing invoices are NOT recalculated**. The stored `try_equivalent` is now wrong.

Additionally, `getDashboardData` recalculates VAT from the raw subtotal (`subtotal * (vat_rate / 100)`) instead of using `try_equivalent.vat_amount`, meaning the dashboard and the invoice list may show different TRY totals for the same invoice.

#### Proposed Fix: Recalculate on Read

Remove `try_equivalent` from the stored data entirely and compute it at query time. This ensures values are always consistent with the current FX rate table:

```js
// database.js
getInvoices(filters = {}) {
  let invoices = this.data.invoices;
  // ... apply filters ...
  return invoices.map(inv => this._attachTryEquivalent(inv));
}

_attachTryEquivalent(invoice) {
  if (invoice.currency === 'TRY') {
    return { ...invoice, try_equivalent: invoice.total };
  }
  const month = invoice.date.substring(0, 7); // "YYYY-MM"
  const rate = this.getFxRate(invoice.currency, month);
  const try_equivalent = rate ? {
    subtotal: invoice.subtotal * rate,
    vat_amount: invoice.vat_amount * rate,
    total: invoice.total * rate,
    rate
  } : null;
  return { ...invoice, try_equivalent };
}
```

#### Alternative: Recompute Utility

If storing `try_equivalent` is intentional (for performance or audit trail), add a utility that recomputes all stored values whenever FX rates change:

```js
// database.js
recomputeAllTryEquivalents() {
  this.data.invoices = this.data.invoices.map(inv => {
    const month = inv.date.substring(0, 7);
    const rate = this.getFxRate(inv.currency, month);
    inv.try_equivalent = rate ? {
      subtotal: inv.subtotal * rate,
      vat_amount: inv.vat_amount * rate,
      total: inv.total * rate,
      rate
    } : null;
    return inv;
  });
  this.saveData();
}

// Call after any FX rate save/update/delete:
saveFxRate(rateData) {
  // ... existing save logic ...
  this.recomputeAllTryEquivalents();
}
```

Also add a warning in `deleteFxRate` that currently only warns but does NOT block deletion even when invoices depend on that rate — either block the deletion or call `recomputeAllTryEquivalents()` after.

---

## 4. High Priority Issues

### 4.1 `isDev` Detection Inconsistency

#### The Bug

`main.js` uses a custom regex to detect the development environment:

```js
// main.js (current)
const isDev = /[\\/]electron/.test(process.execPath);
```

This is fragile. Meanwhile, `electron-is-dev` is already listed as a dependency in `package.json` and is never used.

#### Fix

```js
// main.js
const isDev = require('electron-is-dev');
```

Remove the regex line entirely.

---

### 4.2 Navigation Active State

#### The Bug

The navigation menu uses a hardcoded `defaultSelectedKeys`:

```jsx
// App.js (current)
<Menu defaultSelectedKeys={['1']} ... />
```

`defaultSelectedKeys` is only applied on mount and never updated. No matter which page you navigate to, the menu always shows "Dashboard" as selected.

#### Fix

Use React Router's `useLocation()` hook to derive the selected key dynamically:

```jsx
import { useLocation } from 'react-router-dom';

const routeKeyMap = {
  '/': '1',
  '/invoices': '2',
  '/invoices/new': '2',
  '/fx-rates': '3',
};

function AppLayout() {
  const location = useLocation();
  const selectedKey = routeKeyMap[location.pathname] ?? '1';

  return (
    <Menu selectedKeys={[selectedKey]} ... />
  );
}
```

Note: use `selectedKeys` (controlled), not `defaultSelectedKeys` (uncontrolled).

---

### 4.3 Remove All `console.log` Calls

`InvoiceList.jsx` alone has 15+ `console.log` and `console.warn` statements. These expose internal state to any user who opens DevTools and indicate that logging was used as a debugging aid and never cleaned up.

**Fix:**
1. Search all source files: `grep -r "console\." src/`
2. Remove debug logs entirely — the app has no structured logging need for production.
3. If error logging is needed, create a minimal logger utility:

```js
// src/utils/logger.js
const isDev = window.api?.isDev ?? false;

export const logger = {
  log: (...args) => isDev && console.log(...args),
  warn: (...args) => isDev && console.warn(...args),
  error: (...args) => console.error(...args), // always log errors
};
```

---

### 4.4 `description` Field Missing from InvoiceForm

The `description` field exists in sample data and is part of the implicit data schema, but `InvoiceForm.jsx` has no input for it. Users cannot add or edit descriptions at all.

**Fix:** Add a `Form.Item` for `description` in `InvoiceForm.jsx`:

```jsx
<Form.Item
  name="description"
  label="Açıklama"
>
  <Input.TextArea rows={2} placeholder="İsteğe bağlı açıklama" />
</Form.Item>
```

Ensure the field is included in the form's initial values and submitted payload.

---

### 4.5 Dashboard Has No Loading State

`InvoiceList` and `FxRates` both implement a `loading` state with `<Spin>`, but `Dashboard.jsx` fetches data with no loading indicator. On slow machines or first launch, the dashboard renders empty cards momentarily before data arrives.

**Fix:**

```jsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  window.api.getDashboardData(dateRange)
    .then(data => setDashboardData(data))
    .finally(() => setLoading(false));
}, [dateRange]);

return (
  <Spin spinning={loading}>
    {/* dashboard content */}
  </Spin>
);
```

---

## 5. Medium Priority Issues

### 5.1 Year Range Hardcoded in FxRates

```jsx
// FxRates.jsx (current)
const years = [2025, 2026, 2027, 2028, 2029, 2030];
```

This breaks for any historical data before 2025 and will silently fail to show data for the year 2031+.

**Fix:**

```jsx
const currentYear = dayjs().year();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
// Produces: [currentYear-5 ... currentYear+5]
```

---

### 5.2 VAT Rates Outdated

```jsx
// InvoiceForm.jsx (current)
const vatRates = [0, 5, 10, 16, 20];
```

Turkish VAT rates as of July 2023:
- **0%** — exempt goods
- **1%** — basic food, books
- **8%** — removed; replaced by 10% (but keep for historical invoices)
- **10%** — reduced rate (replaced 8% in 2023)
- **20%** — standard rate (replaced 18% in 2023)

The current list includes `16%` (never a valid Turkish rate) and `5%` (valid only until mid-2023 for some categories) but is missing `1%` and `8%`.

**Fix:**

```jsx
const vatRates = [0, 1, 8, 10, 20]; // ordered; include 8% for historical invoices
```

Add a small tooltip: "8% eski oran (2023 öncesi)" for the legacy rates.

---

### 5.3 Incomplete `useEffect` Dependency Arrays

In `InvoiceList.jsx`, the `filters` state variable is used inside a `useEffect` but is not listed as a dependency:

```jsx
// current — stale closure bug
useEffect(() => {
  fetchInvoices(); // uses `filters` from closure
}, []); // missing: filters
```

**Fix:**

```jsx
useEffect(() => {
  fetchInvoices();
}, [filters]); // add all used variables
```

Audit all `useEffect` hooks across the codebase with `eslint-plugin-react-hooks` (`exhaustive-deps` rule). Add `.eslintrc.js`:

```js
module.exports = {
  extends: ['react-app'],
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
  },
};
```

---

### 5.4 `fetchInvoice` Loads All Records

```jsx
// InvoiceForm.jsx (current)
const res = await window.api.getInvoices();
const invoice = res.invoices.find(i => i.id === parseInt(id));
```

This fetches every invoice just to find one. At scale (thousands of invoices), this is wasteful.

**Fix (option A):** Add a `getInvoiceById(id)` IPC handler:

```js
// main.js
ipcMain.handle('get-invoice-by-id', (_, id) => db.getInvoiceById(id));

// database.js
getInvoiceById(id) {
  return this.data.invoices.find(i => i.id === id) ?? null;
}
```

**Fix (option B):** Pass the invoice object via React Router navigation state from the list view:

```jsx
// InvoiceList.jsx — when navigating to edit
navigate(`/invoices/${invoice.id}`, { state: { invoice } });

// InvoiceForm.jsx
const { state } = useLocation();
const invoice = state?.invoice ?? await window.api.getInvoiceById(id);
```

---

### 5.5 Add React Error Boundaries

Unhandled rendering errors in any component will crash the entire app with a blank white screen. Add an Error Boundary at the app shell level:

```jsx
// src/components/ErrorBoundary.jsx
import React from 'react';
import { Result, Button } from 'antd';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Beklenmedik bir hata oluştu"
          subTitle={this.state.error?.message}
          extra={
            <Button onClick={() => this.setState({ hasError: false })}>
              Tekrar Dene
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
```

Wrap the router in `App.js`:

```jsx
<ErrorBoundary>
  <Router>
    <AppLayout />
  </Router>
</ErrorBoundary>
```

---

### 5.6 Excel Export — No Path Selection Dialog

```jsx
// InvoiceList.jsx (current)
// saves file directly to CWD with no user prompt
```

**Fix:** Use Electron's `dialog.showSaveDialog` via a preload-exposed API:

```js
// main.js
ipcMain.handle('show-save-dialog', async (_, options) => {
  const { filePath } = await dialog.showSaveDialog(options);
  return filePath ?? null;
});

// preload.js
showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
```

```jsx
// InvoiceList.jsx
const filePath = await window.api.showSaveDialog({
  defaultPath: `faturalar-${dayjs().format('YYYY-MM')}.xlsx`,
  filters: [{ name: 'Excel', extensions: ['xlsx'] }],
});
if (filePath) {
  await window.api.exportToExcel(invoices, filePath);
}
```

---

## 6. Low Priority / Future Improvements

### 6.1 TypeScript Migration

Migrate incrementally — no need to convert everything at once:

1. Add `tsconfig.json` with `allowJs: true` and `checkJs: true` to get type checking on existing JS files without renaming them.
2. Rename new files as `.tsx` going forward.
3. Convert high-churn files first (InvoiceForm, database.js).
4. Use `@types/electron` and `@types/react` for type coverage.

---

### 6.2 Replace CRA with Vite

Create React App is in maintenance mode and no longer receives updates. Vite is the community-recommended replacement:

```bash
# rough migration steps
npm install --save-dev vite @vitejs/plugin-react
# move public/index.html → index.html (project root)
# update import paths, remove react-scripts references
# update package.json scripts
```

Benefits: dramatically faster HMR, smaller bundles, active maintenance.

---

### 6.3 Electron Upgrade Path (22 → 33+)

Electron 22 reached end-of-life in October 2023. It no longer receives security patches.

**Migration steps:**

1. `npm install electron@latest --save-dev`
2. Test for any breaking API changes (consult the Electron migration guides for versions 23–33).
3. Key changes to review: `contextIsolation` default changed; `ipcRenderer` usage in preload; Node.js version bundled.
4. Update `electron-builder.yml` target accordingly.

---

### 6.4 Add Unit Tests

`@testing-library/react` and `jest` are already installed (via CRA). There are zero test files.

**Recommended starting points:**

- `database.js` — unit test all CRUD methods and the FX rate calculation logic
- `InvoiceForm.jsx` — test form validation, VAT calculation, submit behavior
- Utility functions — test `calculateTotal`, `formatCurrency`, date helpers

```bash
# run tests
npm test
```

---

### 6.5 Internationalization (i18n)

All UI strings are hardcoded in Turkish. If the app ever needs to support other languages:

- Use `react-i18next`
- Extract all strings to `public/locales/tr/translation.json`
- Even if only Turkish is ever supported, this makes string management and future translation much easier

---

### 6.6 Window State Persistence

Window position and size reset on every launch. Use `electron-store` to persist and restore:

```js
// main.js
const Store = require('electron-store');
const store = new Store();

function createWindow() {
  const bounds = store.get('windowBounds', { width: 1200, height: 800 });
  const win = new BrowserWindow({ ...bounds, ... });

  win.on('close', () => {
    store.set('windowBounds', win.getBounds());
  });
}
```

---

### 6.7 macOS / Linux Autostart

The current autostart feature calls `win32`-specific registry APIs. On macOS/Linux it silently does nothing. Use Electron's built-in `app.setLoginItemSettings()` which handles all platforms:

```js
// main.js
ipcMain.handle('set-autostart', (_, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
  });
});
```

---

## 7. Quick Wins

Changes that can be completed in **under 30 minutes** each:

- [ ] Replace `isDev` regex with `require('electron-is-dev')`
- [ ] Add `description` field to `InvoiceForm.jsx`
- [ ] Fix `defaultSelectedKeys` → `selectedKeys` + `useLocation()`
- [ ] Update VAT rate array to `[0, 1, 8, 10, 20]`
- [ ] Make FxRates year range dynamic with `dayjs().year()`
- [ ] Add `loading` state to Dashboard
- [ ] Remove all `console.log` calls from production components
- [ ] Add atomic write (write-tmp + rename) to `saveData()`
- [ ] Add `.bak` backup before overwrite in `saveData()`
- [ ] Replace "Ales" placeholder with "TaxTracker" in App.js
- [ ] Add `recomputeAllTryEquivalents()` call after FX rate save/delete
- [ ] Add `useEffect` exhaustive-deps ESLint rule
- [ ] Add `ErrorBoundary` component and wrap router

---

## 8. Refactoring Checklist

Use this checklist to track progress through the refactoring roadmap.

### 🔴 Critical

- [ ] **Data atomicity** — implement atomic write (write-tmp + rename) in `saveData()`
- [ ] **Data backup** — add `.bak` copy before each save
- [ ] **SQLite migration** — migrate from JSON to `better-sqlite3`
- [ ] **`try_equivalent` staleness** — recalculate on read OR add `recomputeAllTryEquivalents()`
- [ ] **`deleteFxRate`** — block or recompute after deletion
- [ ] **IPC input sanitization** — validate inputs before passing to `DatabaseManager`
- [ ] **Electron upgrade** — update from EOL v22 to latest LTS

### 🟠 High

- [ ] **`isDev`** — replace regex with `require('electron-is-dev')`
- [ ] **Navigation highlight** — use `useLocation()` + `selectedKeys`
- [ ] **Remove `console.log`** — scrub all debug logs from production code
- [ ] **`description` field** — add to `InvoiceForm.jsx`
- [ ] **Dashboard loading state** — add `<Spin>` while data loads
- [ ] **Dashboard error state** — handle API errors gracefully

### 🟡 Medium

- [ ] **FxRates year range** — make dynamic based on `dayjs().year()`
- [ ] **VAT rates** — update to `[0, 1, 8, 10, 20]`
- [ ] **`useEffect` deps** — fix all stale dependency arrays
- [ ] **`fetchInvoice`** — add `getInvoiceById` IPC or pass via navigation state
- [ ] **Error Boundaries** — add `ErrorBoundary` component at app shell level
- [ ] **Excel export dialog** — use `dialog.showSaveDialog` for file path selection
- [ ] **`getDashboardData` VAT** — use `try_equivalent.vat_amount` consistently

### 🟢 Low / Future

- [ ] **TypeScript** — add `tsconfig.json` with `allowJs`, migrate incrementally
- [ ] **Replace CRA** — migrate to Vite
- [ ] **Unit tests** — write tests for `database.js`, `InvoiceForm`, utilities
- [ ] **i18n** — extract strings to `react-i18next` translation files
- [ ] **Window state** — persist bounds with `electron-store`
- [ ] **macOS/Linux autostart** — use `app.setLoginItemSettings()`
- [ ] **App branding** — replace "Ales" logo with TaxTracker branding
