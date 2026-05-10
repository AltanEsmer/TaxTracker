## CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TaxTracker — Turkish-language Electron desktop app for invoice ("Fatura") and VAT ("KDV") tracking. Electron 22 + React 18 + Ant Design 5. Persistence is JSON files on disk (no SQL DB). UI strings, error messages, and most domain terms are Turkish — keep new strings Turkish to match.

## Commands

```bash
npm run dev          # React dev server on :3000 + Electron together (use this)
npm start            # Electron only (expects pre-built build/)
npm run react-build  # React production bundle only
npm run build        # Full prod build → release/ (clean → react-build → postbuild → electron-builder)
npm run clean        # Remove dist/ and release/
npm run make-portable # Electron Forge zip target (portable Win build)
```

No test runner, no linter configured.

## Architecture

Three processes, one repo:

- **`main.js`** — Electron main. Owns `BrowserWindow`, `Tray`, all `ipcMain.handle` channels, and Excel export (ExcelJS). Instantiates `DatabaseManager` directly (same process — no separate DB server).
- **`preload.js`** — Exposes `window.api` to the renderer via `contextBridge`. The renderer has `nodeIntegration: false` and `contextIsolation: true`; everything must go through this bridge.
- **`src/`** — React renderer. Talks to the main process *only* via `window.api.*`.
- **`database.js`** — JSON-file persistence. Loads everything into memory on startup; rewrites the whole file on every mutation via `_atomicWrite` (tmp file + `.bak` + rename).

Dev/prod detection: `const isDev = !app.isPackaged`.

Renderer entry uses `HashRouter` (required because production loads from `file://build/index.html`). Don't switch to `BrowserRouter`.

Window close hides to system tray rather than quitting; only the tray "Çıkış" item or `before-quit` flips `isQuitting` and lets the app exit. The tray is skipped in dev mode.

## Data flow & persistence

Data paths (resolved by `app.getPath('userData')`):
- Production: `%APPDATA%/Tax Tracker/taxtracker-data/`
- Dev: `%APPDATA%/Electron/taxtracker-data/`

On first prod launch, `DatabaseManager` constructor migrates `invoices.json` / `fxrates.json` from the dev path if the prod path is missing. If both are empty, `initDatabase()` seeds one sample invoice + one FX rate.

`loadData()` also runs **schema migrations in place** for legacy records and re-saves:
- Invoice missing `invoice_type` → defaults to `'Alış'`.
- Invoice with old `amount` field → renamed to `subtotal`, `total` recomputed.
- FX rate with `usd_rate`/`eur_rate` → renamed to `usd_to_try`/`eur_to_try`.

When an FX rate is added/updated/deleted, `recomputeAllTryEquivalents()` walks every invoice and rewrites its `try_equivalent` block. Mutating FX rates is therefore O(invoices) and rewrites `invoices.json`.

## Data models

**Invoice** (`invoices.json`):
```js
{
  id,            // auto-incremented int
  date,          // "YYYY-MM-DD"
  company, invoice_no,
  subtotal, vat_rate, vat_amount, total,
  currency,      // "TRY" | "USD" | "EUR"
  invoice_type,  // "Alış" (purchase) | "Satış" (sale)
  description,
  try_equivalent: { subtotal, vat_amount, total, rate? }  // present for USD/EUR when matching FX rate exists; null otherwise
}
```

**FX Rate** (`fxrates.json`): `{ id, year, month, usd_to_try, eur_to_try }`. One row per `(year, month)` — `addFxRate` upserts on this key.

`_validateInvoice` / `_validateFxRate` enforce the contract on every add/update — keep these in sync when adding fields.

## IPC pattern

All renderer ↔ main calls follow the same three-file pattern:

1. `main.js` — `ipcMain.handle('channel', async (event, …args) => { try { return db.method(…); } catch (e) { console.error(...); throw e; } });`
2. `preload.js` — add a method on the `api` object that calls `ipcRenderer.invoke('channel', …args)`.
3. React — `await window.api.methodName(...)`. Guard with `if (!window.api)` at mount (component falls back to an error toast if running outside Electron).

Excel export is **main-process only** now (uses ExcelJS in `main.js`'s `export-to-excel` handler — note `package.json` still lists `xlsx` in devDependencies but it isn't used at runtime). The renderer calls `window.api.showSaveDialog` then `window.api.exportToExcel(data, filePath)`.

## React conventions

- Ant Design 5 only — no other UI lib. Pages live in `src/pages/`, the only shared component is `src/components/ErrorBoundary.jsx` wrapping `<Routes>` in `App.js`.
- User-facing notifications: `message.success/error/warning` from `antd`, in Turkish.
- Dates: `dayjs`, displayed `DD/MM/YYYY`.
- Currency: 2 decimal places. USD/EUR invoices must always include `try_equivalent`.
- Theme: light/dark toggle stored in `localStorage` under `taxtracker-theme`; CSS variables driven by `data-theme` attribute on `<html>`.

## Build pipeline

`npm run build` runs `scripts/build.js` which executes:

1. `npm run clean` (prebuild hook) — `scripts/clean.js`
2. `npm run react-build` — CRA build into `build/`
3. `npm run postbuild` — `scripts/copy-files.js` copies `main.js`, `preload.js`, `database.js`, icons, and `scripts/autostart-setup.js` into `build/`, and writes a stripped-down `build/package.json`.
4. `electron-builder --config electron-builder.yml` — packages from `build/` → `release/` (NSIS on Win, dmg on Mac, AppImage on Linux).

If you add a new file that the main process requires at runtime, add it to both `scripts/copy-files.js` and the `files:` list in `electron-builder.yml`.

## Adding features

- **New invoice field** — extend `_validateInvoice`, add a migration branch in `loadData()` for old records, then update `InvoiceForm.js` and `InvoiceList.js`. Recompute `try_equivalent` if the field affects totals.
- **New IPC method** — follow the 3-step pattern above. Don't import Node modules in renderer code; everything that touches `fs`/`path`/`electron` lives in main.
- **New page** — add to `src/pages/`, register a `<Route>` and a sidebar `<Menu>` item in `App.js`, and update `getSelectedKey` so the active item highlights.

## Multi-Agent Notes

Multiple agents may work on different modules simultaneously. Do not revert unexpected changes — another agent may have made them. When delegating complex tasks, spawn sub-agents in parallel using claude-sonnet-4-6 by default.

## Important Notes

- Be concise and clear when providing information to user about implementation or error faced.
- Do not create documents in base directory.
- For complex tasks, use sub-agents to implement the tasks parallel with accuracy.
- For sub-agents, use sonnet 4.6 as a default agent if not another model specifically mentioned.
- Do not get confused if there are different changes on different modules. Team is working in this team so agents work on different modules at the same time simultaneously.
- If you see sudden changes in the codebase, do not revert as different agents are running paralelly for same or different modules at the same time. 
- On Windows/PowerShell, do not use Bash heredocs (`<<EOF`); pipe PowerShell here-strings to the target command or use `-c`.
- Documentation Rule: Whenever you create or modify a file(s) in src/db, add or change a server action, or alter a core route, you MUST proactively open the corresponding markdown file in the docs/ directory and update it to reflect your changes. Do not wait for me to ask.

## When completing tasks:

1. Analyze repository structure
2. Use relevant skills from .github/skills (if exists)
3. If have any questions or uncertanity, just ask developer to clarify.

## After implementation finish:

- Write short summary text in console to inform developer what to expect from that implementation.
- Provide guidance on how to test the current phase and inform user if manual approach is needed
- Ensure .github\workflows\ci.yml test will pass as soon as I push to github: Lint check and Type Check.

## About Errors:
- Before implementing, check ERRORS.md for known failure patterns 
related to project. List any that apply before writing code.
- After fixed a bug. Now:
  1. State the root cause in one sentence
  2. Write the generalized rule that prevents this class of error
  3. Append it to ERRORS.md, can be found in each module specifically.
  4. Check if copilot-instructions.md needs updating.
- Do not just fix the symptom. Identify: (a) why this happened, (b) where else in the codebase this same assumption might be wrong, (c) what rule would have prevented it.
