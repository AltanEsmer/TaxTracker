# TaxTracker IPC API Reference

## 1. Overview

TaxTracker uses **Electron's contextBridge** to expose a secure, sandboxed API from the main process to the renderer process. The renderer has no direct access to Node.js or the file system. All data operations go through the `window.api` object injected by `preload.js`.

The bridge is registered under the key `"api"`:

```js
// preload.js (simplified)
contextBridge.exposeInMainWorld('api', {
  getInvoices:      (filters) => ipcRenderer.invoke('get-invoices', filters),
  addInvoice:       (invoice) => ipcRenderer.invoke('add-invoice', invoice),
  updateInvoice:    (id, invoice) => ipcRenderer.invoke('update-invoice', id, invoice),
  deleteInvoice:    (id) => ipcRenderer.invoke('delete-invoice', id),
  getFxRates:       (year, month) => ipcRenderer.invoke('get-fx-rates', year, month),
  addFxRate:        (fxRate) => ipcRenderer.invoke('add-fx-rate', fxRate),
  updateFxRate:     (id, fxRate) => ipcRenderer.invoke('update-fx-rate', id, fxRate),
  deleteFxRate:     (id) => ipcRenderer.invoke('delete-fx-rate', id),
  getDashboardData: (filters) => ipcRenderer.invoke('get-dashboard-data', filters),
});
```

All methods are available on `window.api` in React components and renderer-side scripts.

---

## 2. Usage Pattern

All `window.api` methods return **Promises**. Use `async/await` or `.then()`:

```js
// Fetching invoices with filters
async function loadInvoices() {
  try {
    const invoices = await window.api.getInvoices({
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      currency: 'USD',
    });
    console.log(invoices); // Invoice[]
  } catch (err) {
    console.error('Failed to load invoices:', err.message);
  }
}

// Adding a new invoice
async function createInvoice(formData) {
  const newInvoice = await window.api.addInvoice(formData);
  console.log('Created with id:', newInvoice.id);
}
```

---

## 3. Error Handling

Errors thrown in the main process are serialized and re-thrown in the renderer as standard JavaScript `Error` objects. The `message` property will contain the original error message.

Common error conditions:

| Situation | Error message (approximate) |
|-----------|----------------------------|
| `updateInvoice` with unknown id | `"Invoice with id X not found"` |
| `deleteInvoice` with unknown id | `"Invoice with id X not found"` |
| `updateFxRate` with unknown id | `"FX rate with id X not found"` |
| `deleteFxRate` with unknown id | `"FX rate with id X not found"` |
| Disk write failure | OS-level I/O error message |

Always wrap `window.api` calls in `try/catch` (or attach a `.catch()` handler) when the result is critical to UI state.

---

## 4. Method Reference

---

### `getInvoices(filters?)`

Retrieves invoices, optionally filtered.

**Signature:**
```ts
window.api.getInvoices(filters?: InvoiceFilters): Promise<Invoice[]>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filters` | `InvoiceFilters` | No | Filter criteria. Omit or pass `undefined` to return all invoices. |
| `filters.startDate` | `string` | No | Inclusive lower bound in `YYYY-MM-DD` format. Compared lexicographically against `invoice.date`. |
| `filters.endDate` | `string` | No | Inclusive upper bound in `YYYY-MM-DD` format. Compared lexicographically against `invoice.date`. |
| `filters.company` | `string` | No | Case-insensitive substring match against `invoice.company`. |
| `filters.currency` | `string` | No | Exact match against `invoice.currency` (`"TRY"`, `"USD"`, or `"EUR"`). |
| `filters.invoice_type` | `string` | No | Exact match against `invoice.invoice_type` (`"Alış"` or `"Satış"`). |

**Returns:** `Promise<Invoice[]>` — Array of matching invoices sorted by `date` descending. Returns an empty array if no invoices match.

**Behavior notes:**
- All filters are applied with AND logic — every specified filter must match.
- Date comparison is a lexicographic string comparison, which works correctly for `YYYY-MM-DD` formatted dates.
- Company match is case-insensitive and matches any substring (e.g. `"örnek"` matches `"Örnek Şirket A.Ş."`).

**Example:**
```js
// All USD purchases in Q1 2025
const invoices = await window.api.getInvoices({
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  currency: 'USD',
  invoice_type: 'Alış',
});
```

---

### `addInvoice(invoice)`

Creates a new invoice and persists it to disk.

**Signature:**
```ts
window.api.addInvoice(invoice: Omit<Invoice, 'id'>): Promise<Invoice>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `invoice.date` | `string` | Yes | Invoice date in `YYYY-MM-DD` format. |
| `invoice.company` | `string` | Yes | Counterparty company name. |
| `invoice_no` | `string` | Yes | Invoice document number. Uniqueness is not enforced. |
| `invoice.invoice_type` | `string` | Yes | `"Alış"` or `"Satış"`. |
| `invoice.currency` | `string` | Yes | `"TRY"`, `"USD"`, or `"EUR"`. |
| `invoice.subtotal` | `number` | Yes | Pre-VAT amount. |
| `invoice.vat_rate` | `number` | Yes | VAT percentage: `0`, `5`, `10`, `16`, or `20`. |
| `invoice.total` | `number` | Yes | Total including VAT (may be manually set). |
| `invoice.try_equivalent` | `object\|null` | No | Pass `null` for TRY invoices. Typically computed by the frontend before calling this method. |
| `invoice.description` | `string` | No | Optional free-text memo. |

**Returns:** `Promise<Invoice>` — The full invoice object with `id` assigned.

**Behavior notes:**
- `id` is auto-generated as `Math.max(...existingIds) + 1`.
- `try_equivalent` is not automatically computed by this method — the caller is responsible for computing and passing it.
- The entire in-memory invoice array is written to disk after insertion.

**Example:**
```js
const newInvoice = await window.api.addInvoice({
  date: '2025-04-01',
  company: 'Örnek Şirket A.Ş.',
  invoice_no: 'FTR-2025-010',
  invoice_type: 'Alış',
  currency: 'USD',
  subtotal: 1000,
  vat_rate: 20,
  total: 1200,
  try_equivalent: {
    subtotal: 32500,
    vat_amount: 6500,
    total: 39000,
  },
});
console.log(newInvoice.id); // e.g. 11
```

---

### `updateInvoice(id, invoice)`

Replaces an existing invoice by id.

**Signature:**
```ts
window.api.updateInvoice(id: number, invoice: Omit<Invoice, 'id'>): Promise<Invoice>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `number` | Yes | The `id` of the invoice to replace. |
| `invoice` | `Omit<Invoice, 'id'>` | Yes | Full invoice payload (same fields as `addInvoice`). The `id` field in the payload is ignored; the path parameter `id` is authoritative. |

**Returns:** `Promise<Invoice>` — The updated invoice object (with the original `id` preserved).

**Behavior notes:**
- This is a **full replacement**, not a partial update (no PATCH semantics). All fields must be provided.
- Throws if no invoice with the given `id` exists.
- Persists to disk after update.

**Example:**
```js
const updated = await window.api.updateInvoice(11, {
  date: '2025-04-01',
  company: 'Örnek Şirket A.Ş.',
  invoice_no: 'FTR-2025-010',
  invoice_type: 'Alış',
  currency: 'USD',
  subtotal: 1100,
  vat_rate: 20,
  total: 1320,
  try_equivalent: { subtotal: 35750, vat_amount: 7150, total: 42900 },
});
```

---

### `deleteInvoice(id)`

Deletes an invoice by id.

**Signature:**
```ts
window.api.deleteInvoice(id: number): Promise<{ id: number }>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `number` | Yes | The `id` of the invoice to delete. |

**Returns:** `Promise<{ id: number }>` — An object confirming the deleted id.

**Behavior notes:**
- Throws if no invoice with the given `id` exists.
- Deletion is permanent — there is no soft-delete or recycle bin.
- Persists the updated array to disk after deletion.

**Example:**
```js
const result = await window.api.deleteInvoice(11);
console.log(result.id); // 11
```

---

### `getFxRates(year?, month?)`

Retrieves FX rate records, optionally filtered by year and/or month.

**Signature:**
```ts
window.api.getFxRates(year?: number, month?: number): Promise<FxRate[]>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `year` | `number` | No | 4-digit year. If omitted, all records are returned. |
| `month` | `number` | No | Month `1`–`12`. Only meaningful when `year` is also provided. |

**Returns:** `Promise<FxRate[]>` — Matching records sorted by year+month descending.

**Behavior notes:**
- Calling with no arguments returns all FX rate records.
- Calling with only `year` returns all months for that year.
- Calling with both `year` and `month` returns at most one record (the rate for that specific month).
- Calling with only `month` (no `year`) is not a supported filter combination — pass both or just year.

**Example:**
```js
const allRates   = await window.api.getFxRates();
const rates2025  = await window.api.getFxRates(2025);
const march2025  = await window.api.getFxRates(2025, 3);
```

---

### `addFxRate(fxRate)`

Creates a new FX rate record, or updates the existing one if the same year+month already exists (upsert).

**Signature:**
```ts
window.api.addFxRate(fxRate: Omit<FxRate, 'id'>): Promise<FxRate>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fxRate.year` | `number` | Yes | 4-digit year. |
| `fxRate.month` | `number` | Yes | Month `1`–`12`. |
| `fxRate.usd_to_try` | `number` | Yes | USD → TRY rate (4 decimal places). |
| `fxRate.eur_to_try` | `number` | Yes | EUR → TRY rate (4 decimal places). |

**Returns:** `Promise<FxRate>` — The inserted or updated FxRate object (with `id`).

**Behavior notes:**
- If a record with the same `year` + `month` already exists, it is **updated** (the existing `id` is preserved).
- If no such record exists, a new one is inserted with an auto-generated `id`.
- This upsert behavior means calling `addFxRate` is idempotent for a given month — it is safe to call multiple times.

**Example:**
```js
const rate = await window.api.addFxRate({
  year: 2025,
  month: 4,
  usd_to_try: 33.1500,
  eur_to_try: 35.8000,
});
console.log(rate.id);
```

---

### `updateFxRate(id, fxRate)`

Replaces an existing FX rate record by id.

**Signature:**
```ts
window.api.updateFxRate(id: number, fxRate: Omit<FxRate, 'id'>): Promise<FxRate>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `number` | Yes | The `id` of the FX rate record to update. |
| `fxRate` | `Omit<FxRate, 'id'>` | Yes | Full replacement payload (year, month, usd_to_try, eur_to_try). |

**Returns:** `Promise<FxRate>` — The updated FxRate object.

**Behavior notes:**
- Full replacement — all four fields must be provided.
- Throws if no record with the given `id` exists.
- Does **not** recalculate `try_equivalent` on any existing invoices.

**Example:**
```js
const updated = await window.api.updateFxRate(18, {
  year: 2025,
  month: 3,
  usd_to_try: 32.9000,
  eur_to_try: 35.2500,
});
```

---

### `deleteFxRate(id)`

Deletes an FX rate record by id.

**Signature:**
```ts
window.api.deleteFxRate(id: number): Promise<{ id: number, hasInvoices: boolean, invoiceCount: number }>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `number` | Yes | The `id` of the FX rate record to delete. |

**Returns:** `Promise<{ id: number, hasInvoices: boolean, invoiceCount: number }>` — Deletion confirmation plus invoice impact metadata.

| Return field | Type | Description |
|--------------|------|-------------|
| `id` | `number` | The id of the deleted record. |
| `hasInvoices` | `boolean` | `true` if there are invoices whose date falls in the deleted rate's year+month. |
| `invoiceCount` | `number` | Number of invoices in that month (informational only). |

**Behavior notes:**
- Throws if no record with the given `id` exists.
- Deletion is **not blocked** even if `hasInvoices` is `true`. The caller is responsible for warning the user.
- Existing invoices that used this rate retain their `try_equivalent` snapshot — it is not cleared.

**Example:**
```js
const result = await window.api.deleteFxRate(18);
if (result.hasInvoices) {
  console.warn(`Deleted rate had ${result.invoiceCount} associated invoice(s).`);
}
```

---

### `getDashboardData(filters?)`

Returns aggregated analytics data for the dashboard view.

**Signature:**
```ts
window.api.getDashboardData(filters?: DashboardFilters): Promise<DashboardData>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filters` | `DashboardFilters` | No | Filter criteria. Omit to aggregate all data. |
| `filters.startDate` | `string` | No | Inclusive start date in `YYYY-MM-DD` format. |
| `filters.endDate` | `string` | No | Inclusive end date in `YYYY-MM-DD` format. |
| `filters.invoice_type` | `string` | No | `"Alış"` or `"Satış"`. Limits aggregations to one invoice direction. |

**Returns:** `Promise<DashboardData>` — Aggregated data object. See structure below.

**Return structure:**

```
{
  vatByMonth:           VatByMonthRow[],
  currencyDistribution: CurrencyDistributionRow[],
  monthlyTotals:        MonthlyTotalsRow[],
  rawInvoices:          Invoice[],
}
```

| Aggregation | Row shape | Description |
|-------------|-----------|-------------|
| `vatByMonth` | `{ month: string, currency: string, invoice_type: string, vat_amount: number, invoice_count: number }` | VAT totals grouped by month (`YYYY-MM`), currency, and invoice type. `vat_amount` = `subtotal × (vat_rate / 100)` — uses the raw invoice values, **not** `try_equivalent`. |
| `currencyDistribution` | `{ currency: string, invoice_type: string, count: number, total_amount: number }` | Invoice count and total amount grouped by currency and type. |
| `monthlyTotals` | `{ month: string, invoice_type: string, total_amount: number, invoice_count: number }` | Monthly invoice totals grouped by invoice type. |
| `rawInvoices` | `Invoice[]` | The full list of invoices matching the filters (same as `getInvoices` with date and type filters). |

**Behavior notes:**
- `vat_amount` in `vatByMonth` is always computed from the native currency subtotal, regardless of `currency`. It does not convert to TRY.
- All aggregations apply the same date and `invoice_type` filters before grouping.
- `rawInvoices` respects the same filters as the aggregations.

**Example:**
```js
const data = await window.api.getDashboardData({
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  invoice_type: 'Alış',
});

console.log(data.vatByMonth);
console.log(data.currencyDistribution);
console.log(data.monthlyTotals);
console.log(data.rawInvoices.length);
```

---

## 5. Type Definitions

TypeScript-style interface definitions for all data structures used by the API.

```ts
interface Invoice {
  id: number;
  date: string;                   // "YYYY-MM-DD"
  company: string;
  invoice_no: string;
  invoice_type: 'Alış' | 'Satış';
  currency: 'TRY' | 'USD' | 'EUR';
  subtotal: number;
  vat_rate: 0 | 5 | 10 | 16 | 20;
  total: number;
  try_equivalent: TryEquivalent | null;
  description?: string;
}

interface TryEquivalent {
  subtotal: number;
  vat_amount: number;
  total: number;
}

interface FxRate {
  id: number;
  year: number;
  month: number;                  // 1–12
  usd_to_try: number;
  eur_to_try: number;
}

interface InvoiceFilters {
  startDate?: string;             // "YYYY-MM-DD", inclusive
  endDate?: string;               // "YYYY-MM-DD", inclusive
  company?: string;               // case-insensitive substring
  currency?: 'TRY' | 'USD' | 'EUR';
  invoice_type?: 'Alış' | 'Satış';
}

interface DashboardFilters {
  startDate?: string;             // "YYYY-MM-DD", inclusive
  endDate?: string;               // "YYYY-MM-DD", inclusive
  invoice_type?: 'Alış' | 'Satış';
}

interface VatByMonthRow {
  month: string;                  // "YYYY-MM"
  currency: string;
  invoice_type: string;
  vat_amount: number;
  invoice_count: number;
}

interface CurrencyDistributionRow {
  currency: string;
  invoice_type: string;
  count: number;
  total_amount: number;
}

interface MonthlyTotalsRow {
  month: string;                  // "YYYY-MM"
  invoice_type: string;
  total_amount: number;
  invoice_count: number;
}

interface DashboardData {
  vatByMonth: VatByMonthRow[];
  currencyDistribution: CurrencyDistributionRow[];
  monthlyTotals: MonthlyTotalsRow[];
  rawInvoices: Invoice[];
}

interface DeleteFxRateResult {
  id: number;
  hasInvoices: boolean;
  invoiceCount: number;
}
```
