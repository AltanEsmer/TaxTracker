# TaxTracker Data Model Reference

## 1. Overview

TaxTracker uses a **flat-file JSON storage** approach — no database engine is involved. All data is stored in two JSON files on disk:

| File | Contents |
|------|----------|
| `invoices.json` | Array of Invoice objects |
| `fxrates.json` | Array of FxRate objects |

### File Locations

| Environment | Path |
|-------------|------|
| Production | `%APPDATA%\tax-tracker\taxtracker-data\` |
| Development (Electron) | `%APPDATA%\Electron\taxtracker-data\` |

### In-Memory Caching Pattern

On application startup, both files are read from disk and loaded into memory as JavaScript arrays. All read operations are served from these in-memory arrays. All write operations (add, update, delete) mutate the in-memory array first and then synchronously persist the entire array back to disk as formatted JSON. There is no lazy loading, write batching, or change journaling — every mutation triggers a full file rewrite.

---

## 2. Invoice Schema

An invoice represents a single purchase (`Alış`) or sale (`Satış`) transaction.

### Top-Level Fields

| Field | Type | Required | Allowed Values / Constraints | Description |
|-------|------|----------|------------------------------|-------------|
| `id` | `integer` | Yes (auto) | Positive integer, unique | Auto-incremented primary key. See [ID Generation](#5-id-generation). |
| `date` | `string` | Yes | `YYYY-MM-DD` format | Transaction date. Used for date-range filtering and linking to FX rates. |
| `company` | `string` | Yes | Any non-empty string | Name of the counterparty company. |
| `invoice_no` | `string` | Yes | Any string | Invoice document number (e.g. `FTR-2025-001`). **Not enforced as unique.** |
| `invoice_type` | `string` | Yes | `"Alış"` or `"Satış"` | Purchase or sale. Defaults to `"Alış"` if missing on read. |
| `currency` | `string` | Yes | `"TRY"`, `"USD"`, `"EUR"` | Invoice currency. |
| `subtotal` | `number` | Yes (cache) | Finite float ≥ 0 | Sum of `line_items[].subtotal`. Always recomputed server-side from line items. |
| `vat_amount` | `number` | Yes (cache) | Finite float ≥ 0 | Sum of `line_items[].vat_amount`. Always recomputed server-side. |
| `vat_rate` | `number \| null` | Yes | `0`–`100` or `null` | Shared VAT rate when every line uses the same rate; `null` when lines use different rates (mixed/"Karışık" invoice). |
| `total` | `number` | Yes (cache) | Finite float ≥ 0 | `subtotal + vat_amount`. May be manually overridden via the form **only when the invoice has a single line item**. |
| `line_items` | `array` | Yes | At least one item | Per-product breakdown. Each item has its own KDV rate so a single invoice can mix e.g. `%10` and `%16` lines. See [Line Items](#21-line-items). |
| `try_equivalent` | `object\|null` | No | See nested schema below | TRY conversion computed at save time. `null` or absent for TRY invoices. |
| `description` | `string` | No | Any string | Optional invoice-level free-text memo (separate from per-line descriptions). |

### 2.1 Line Items

`line_items` is an array of one or more objects. Each represents a product/service charged on the invoice with its own KDV rate.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | `integer` | Yes (auto) | Unique within the invoice | Per-line index assigned server-side. |
| `description` | `string` | No | Any string | Per-line product/service description. |
| `subtotal` | `number` | Yes | Finite float ≥ 0 | Pre-VAT amount for this line in the invoice currency. |
| `vat_rate` | `number` | Yes | Finite float ≥ 0 | KDV percent for this line. May differ from sibling lines. |
| `vat_amount` | `number` | Yes (cache) | Finite float ≥ 0 | `subtotal × (vat_rate / 100)`. Recomputed server-side. |

**Invariants enforced by the data layer:**

- Invoice-level `subtotal`, `vat_amount`, and `total` are always derived from `line_items` and overwritten on every save — clients cannot lie about totals.
- Invoice-level `vat_rate` is the single shared rate (rounded to 2 decimal places) when all lines agree, or `null` when two or more distinct rates are present.
- A manual `total` override is only honored when the invoice has exactly one line item (preserves a small legacy ergonomics workflow without breaking the sum-of-lines invariant).

### `try_equivalent` Nested Object

Present only when `currency` is `"USD"` or `"EUR"` and a matching FX rate exists for the invoice's year+month. For TRY invoices it mirrors the raw invoice amounts.

| Field | Type | Description |
|-------|------|-------------|
| `subtotal` | `number` | `invoice.subtotal × fx_rate` |
| `vat_amount` | `number` | Sum of per-line VAT amounts converted to TRY |
| `total` | `number` | `invoice.total × fx_rate` |
| `rate` | `number` | The FX rate used (foreign currency only) |
| `line_items` | `array` | Per-line TRY equivalents: `{ id, subtotal, vat_amount }` for each invoice line |

> **Note:** `try_equivalent` is rebuilt whenever an invoice is saved or whenever the FX rate for its month is added/updated/deleted (`recomputeAllTryEquivalents` walks every invoice). It is a derived cache, not a long-lived snapshot.

---

## 3. FxRate Schema

An FX rate record stores the monthly average exchange rates used to convert foreign-currency invoice amounts into Turkish Lira (TRY).

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | `integer` | Yes (auto) | Positive integer, unique | Auto-incremented primary key. |
| `year` | `integer` | Yes | 4-digit year (e.g. `2025`) | The calendar year this rate applies to. |
| `month` | `integer` | Yes | `1`–`12` | The calendar month this rate applies to. |
| `usd_to_try` | `number` | Yes | Float, stored to 4 decimal places | How many TRY one USD buys this month. |
| `eur_to_try` | `number` | Yes | Float, stored to 4 decimal places | How many TRY one EUR buys this month. |

> **Composite key:** `(year, month)` acts as a logical unique key. `addFxRate` performs an **upsert** — if a record with the same year+month already exists, it is updated in place rather than creating a duplicate. This constraint is enforced in application logic only; the JSON file itself has no index.

---

## 4. Relationships

TaxTracker has no foreign key mechanism. The relationship between invoices and FX rates is **implicit and soft**:

- When an invoice in a foreign currency (`USD` or `EUR`) is saved, the application looks up the FxRate record whose `year` and `month` match the invoice's `date` field.
- If a matching FxRate is found, `try_equivalent` is computed and stored on the invoice.
- If no matching FxRate exists at save time, `try_equivalent` is left `null`.

### Implications of the Flat-File Approach

| Concern | Behavior |
|---------|----------|
| Referential integrity | None. An FxRate can be deleted even if invoices reference it; those invoices retain their `try_equivalent` snapshot. |
| Cascading updates | None. Changing an FxRate does **not** update `try_equivalent` on existing invoices. |
| Concurrent writes | Not safe. Simultaneous writes from multiple processes would result in data loss (last write wins). |
| Transactions | Not supported. A crash mid-write can leave a file in a corrupted state. |
| Query performance | O(n) full scan for all filters. Acceptable for the expected data volume of a single-user desktop app. |

---

## 5. ID Generation

Both `Invoice.id` and `FxRate.id` are generated using:

```js
const newId = existingRecords.length > 0
  ? Math.max(...existingRecords.map(r => r.id)) + 1
  : 1;
```

### Edge Cases

| Scenario | Result |
|----------|--------|
| Empty array (first record) | `id = 1` |
| Records exist with ids `[1, 2, 3]` | `id = 4` |
| A record was deleted, leaving gaps (e.g. `[1, 3]`) | `id = 4` (max + 1, not fill-the-gap) |
| IDs were manually edited to be non-sequential | `id = highest + 1` |
| Very large array (spread operator limit) | `Math.max(...array)` may throw a "Maximum call stack size exceeded" error for tens of thousands of records |

> **Warning:** IDs are never reused after deletion. Deleted IDs leave permanent gaps in the sequence.

---

## 6. Data Migration

On the first production run, TaxTracker checks whether the production data directory (`%APPDATA%\tax-tracker\taxtracker-data\`) is empty or missing. If it is, and if the development data directory (`%APPDATA%\Electron\taxtracker-data\`) contains data, the dev files are copied to the prod location.

This one-time migration allows developers to transition from Electron dev mode to a packaged production build without losing test or seed data. After the initial copy, the prod and dev data files are independent — changes in one do not affect the other.

---

## 7. Example Documents

### Invoice — Foreign Currency Purchase

```json
{
  "id": 42,
  "date": "2025-03-10",
  "company": "Acme Software GmbH",
  "invoice_no": "INV-2025-0042",
  "invoice_type": "Alış",
  "currency": "EUR",
  "subtotal": 2500.00,
  "vat_rate": 20,
  "vat_amount": 500.00,
  "total": 3000.00,
  "line_items": [
    { "id": 1, "description": "Yıllık yazılım lisansı", "subtotal": 2500.00, "vat_rate": 20, "vat_amount": 500.00 }
  ],
  "try_equivalent": {
    "subtotal": 87750.00,
    "vat_amount": 17550.00,
    "total": 105300.00,
    "rate": 35.10,
    "line_items": [
      { "id": 1, "subtotal": 87750.00, "vat_amount": 17550.00 }
    ]
  },
  "description": "Yıllık yazılım lisansı"
}
```

### Invoice — Domestic Mixed-Rate Sale (`Karışık` KDV)

```json
{
  "id": 44,
  "date": "2025-04-02",
  "company": "Karma Market Ltd. Şti.",
  "invoice_no": "STR-2025-0044",
  "invoice_type": "Satış",
  "currency": "TRY",
  "subtotal": 1500.00,
  "vat_rate": null,
  "vat_amount": 180.00,
  "total": 1680.00,
  "line_items": [
    { "id": 1, "description": "Gıda ürünü",  "subtotal": 1000.00, "vat_rate": 10, "vat_amount": 100.00 },
    { "id": 2, "description": "Aksesuar",    "subtotal":  500.00, "vat_rate": 16, "vat_amount":  80.00 }
  ],
  "try_equivalent": {
    "subtotal": 1500.00,
    "vat_amount": 180.00,
    "total": 1680.00,
    "line_items": [
      { "id": 1, "subtotal": 1000.00, "vat_amount": 100.00 },
      { "id": 2, "subtotal":  500.00, "vat_amount":  80.00 }
    ]
  }
}
```

### Invoice — Domestic TRY Sale (single rate)

```json
{
  "id": 43,
  "date": "2025-03-15",
  "company": "Yerel Müşteri Ltd. Şti.",
  "invoice_no": "STR-2025-0043",
  "invoice_type": "Satış",
  "currency": "TRY",
  "subtotal": 15000.00,
  "vat_rate": 10,
  "vat_amount": 1500.00,
  "total": 16500.00,
  "line_items": [
    { "id": 1, "description": "Danışmanlık hizmeti", "subtotal": 15000.00, "vat_rate": 10, "vat_amount": 1500.00 }
  ]
}
```

### FxRate — Monthly Rate Record

```json
{
  "id": 18,
  "year": 2025,
  "month": 3,
  "usd_to_try": 32.8500,
  "eur_to_try": 35.1000
}
```

---

## 8. Data Integrity Notes

The following constraints are **not enforced** by TaxTracker's storage layer:

| Constraint | Status |
|------------|--------|
| `invoice_no` uniqueness | ❌ Not checked — duplicate invoice numbers are silently allowed |
| `invoice_type` enum validation | ⚠️ Defaulted to `"Alış"` on read if missing, but not validated on write |
| `vat_rate` enum validation | ❌ Any number can be stored; UI constrains it but the API does not |
| `currency` enum validation | ❌ Any string can be stored; not checked server-side |
| `date` format validation | ❌ Any string is accepted; malformed dates will silently break date filtering |
| FxRate `(year, month)` uniqueness | ⚠️ Enforced only in application logic via upsert; JSON file has no index |
| Referential integrity (invoice → fxrate) | ❌ FX rates can be deleted while invoices still reference them |
| Atomic writes | ❌ No write-ahead log or backup — a crash during `fs.writeFileSync` can corrupt the data file |
| `try_equivalent` freshness | ❌ Not recalculated when FX rates change; always reflects the rate at time of save |
