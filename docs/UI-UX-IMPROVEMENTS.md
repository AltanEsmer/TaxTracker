# TaxTracker — UI/UX Improvement Guide

> **Status (2026-05-11):** Most issues identified below have been resolved by the **"Quiet Premium"** redesign on branch `redesign/quiet-premium`. See [`docs/STYLE-GUIDE.md` §13](STYLE-GUIDE.md#13-quiet-premium-active) for the current design system. The original audit and recommendations are kept here for historical context.
>
> **Resolved by the redesign:**
> - Active menu item now derives from `useLocation()` in `src/App.js`
> - Save dialog flow already in place via `window.api.showSaveDialog`
> - Description field present on `InvoiceForm`
> - Dark mode shipped (toggle in sidebar footer, `localStorage['taxtracker-theme']`)
> - Currency display uses dual-line cells (native + TRY equivalent) with currency-coloured numerics
> - Form layout split into 2-column metadata + money zone with VAT chip selector
>
> **Still open** (not addressed by the redesign):
> - Unsaved-changes warning when leaving `InvoiceForm`
> - Bulk-edit beyond bulk-delete on `InvoiceList`
> - Pagination control on `InvoiceList` (currently single scroll)

## 1. Overview

TaxTracker's UI is built with Ant Design 5 and covers the core workflows well: entering invoices, managing FX rates, and viewing a summary dashboard. However, several implementation bugs make the interface feel inconsistent (navigation never highlights the active page), and a handful of missing features create friction in daily use (no description field, no save-file dialog, no unsaved-changes warning).

This document describes every identified UI/UX issue, explains why it matters to the user, and provides a concrete implementation path — including code snippets — for each fix.

**Guiding principles:**
- Follow Ant Design conventions (controlled components, `Form` instance, `message` API for feedback).
- Prioritize fixes that affect every session (navigation, loading states) over one-time setup issues.
- Each improvement should be independently shippable — no fix depends on another unless noted.

---

## 2. Navigation

### 2.1 Bug: Active Menu Item Never Updates

**Why it's a problem:** The navigation sidebar always shows "Dashboard" as selected, regardless of which page the user is on. After the first click, the visual active state is permanently out of sync with the actual route. Users lose their sense of location in the app.

**Root cause:**

```jsx
// App.js (current)
<Menu defaultSelectedKeys={['1']} items={menuItems} />
```

`defaultSelectedKeys` is an uncontrolled prop — it only applies on mount and is never updated as the route changes.

**Fix:** Switch to the controlled `selectedKeys` prop and derive the active key from the current route using `useLocation()`:

```jsx
// App.js
import { useLocation, useNavigate } from 'react-router-dom';

const routeKeyMap = {
  '/': '1',
  '/invoices': '2',
  '/fx-rates': '3',
};

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Match prefix so /invoices/new and /invoices/42 both highlight "Faturalar"
  const selectedKey = Object.entries(routeKeyMap)
    .reverse()
    .find(([path]) => location.pathname.startsWith(path))?.[1] ?? '1';

  return (
    <Menu
      selectedKeys={[selectedKey]}
      onClick={({ key }) => navigate(keyRouteMap[key])}
      items={menuItems}
    />
  );
}
```

### 2.2 Improvement: Add Breadcrumbs on Inner Pages

On pages like Invoice Edit (`/invoices/42`), there is no breadcrumb or back button — users must click the sidebar item to go back, which also triggers a data reload.

**Fix:** Add Ant Design `Breadcrumb` at the top of inner pages:

```jsx
// InvoiceForm.jsx
import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

<Breadcrumb
  items={[
    { title: <Link to="/invoices">Faturalar</Link> },
    { title: isEdit ? 'Fatura Düzenle' : 'Yeni Fatura' },
  ]}
  style={{ marginBottom: 16 }}
/>
```

---

## 3. Dashboard Page

### 3.1 No Loading State

**Why it's a problem:** The dashboard fires an async data fetch on mount, but renders empty cards with `0` values until the data arrives. On slower machines this flash of empty content looks like a bug.

**Fix:**

```jsx
// Dashboard.jsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  window.api.getDashboardData(dateRange)
    .then(data => setDashboardData(data))
    .catch(err => message.error('Veriler yüklenemedi'))
    .finally(() => setLoading(false));
}, [dateRange]);

return (
  <Spin spinning={loading} tip="Yükleniyor...">
    <Row gutter={[16, 16]}>
      {/* ... stat cards ... */}
    </Row>
  </Spin>
);
```

### 3.2 No Empty State

**Why it's a problem:** A brand-new user sees zeros everywhere with no prompt to add their first invoice. It's unclear whether the app is working correctly or there's a configuration problem.

**Fix:** Show an `Empty` component with a CTA when there are no invoices:

```jsx
// Dashboard.jsx
if (!loading && dashboardData.totalInvoices === 0) {
  return (
    <Empty
      description="Henüz fatura eklenmedi"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    >
      <Button type="primary" onClick={() => navigate('/invoices/new')}>
        İlk Faturayı Ekle
      </Button>
    </Empty>
  );
}
```

### 3.3 Date Range Filter Resets on Navigation

**Why it's a problem:** Users frequently switch between Dashboard and Invoice List to investigate a number. Every time they return to the dashboard, the date range resets to the default, forcing them to re-select the period.

**Fix:** Lift the date range state into a React context or persist it to `sessionStorage`:

```jsx
// Option A: sessionStorage (simplest)
const [dateRange, setDateRange] = useState(() => {
  const saved = sessionStorage.getItem('dashboard-dateRange');
  return saved ? JSON.parse(saved) : defaultRange;
});

const handleRangeChange = (range) => {
  setDateRange(range);
  sessionStorage.setItem('dashboard-dateRange', JSON.stringify(range));
};
```

### 3.4 Add "Net VAT Position" Card

**Why it's a problem:** The most important number for VAT compliance is the net VAT owed (VAT collected from customers minus VAT paid to suppliers). This card is missing — users must mentally subtract the two figures.

**Fix:** Add a fourth stat card:

```jsx
const netVat = dashboardData.vatCollected - dashboardData.vatPaid;

<Col span={6}>
  <Card>
    <Statistic
      title="Net KDV Pozisyonu"
      value={netVat}
      precision={2}
      suffix="₺"
      valueStyle={{ color: netVat >= 0 ? '#cf1322' : '#3f8600' }}
      prefix={netVat >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
    />
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      {netVat >= 0 ? 'Ödenecek KDV' : 'İade Alınacak KDV'}
    </Typography.Text>
  </Card>
</Col>
```

### 3.5 Charts Need Better Labels and Tooltips

**Why it's a problem:** Chart.js default tooltips show raw numbers with no currency symbol. The axis labels use abbreviated month codes that may be unclear.

**Fix:** Add a currency formatter to Chart.js tooltip callbacks:

```jsx
// Dashboard.jsx
const chartOptions = {
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) =>
          `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString('tr-TR', {
            style: 'currency',
            currency: 'TRY',
          })}`,
      },
    },
  },
};
```

---

## 4. Invoice List Page

### 4.1 Filter Reset Does Not Clear Date Picker Visually

**Why it's a problem:** Clicking "Filtreleri Temizle" resets the `filters` state but the Ant Design `DatePicker.RangePicker` component is controlled independently. After reset, the state is clear but the picker still shows the previously selected dates. This confuses users who think their filter is still active.

**Fix:** Use a controlled value on the `RangePicker` and reset it explicitly:

```jsx
const [datePickerValue, setDatePickerValue] = useState(null);

const handleReset = () => {
  setFilters(defaultFilters);
  setDatePickerValue(null); // clears the visual state
};

<RangePicker
  value={datePickerValue}
  onChange={(dates) => {
    setDatePickerValue(dates);
    setFilters(prev => ({ ...prev, dateRange: dates }));
  }}
/>
```

### 4.2 Remove `console.log` Calls

**Why it's a problem:** `InvoiceList.jsx` contains 15+ `console.log` and `console.warn` statements. Any user who opens DevTools (F12) sees internal state dumps on every render and action. This is a privacy and professionalism issue.

**Fix:** Delete all debug `console.log` lines. If diagnostic logging is needed for troubleshooting, gate it behind an `isDev` flag (see REFACTORING.md §4.3).

### 4.3 Excel Export — No Path or Confirmation

**Why it's a problem:** The export silently writes a file to the app's current working directory. Users get no indication of where the file was saved or what it's named.

**Fix (A — best):** Use Electron's save dialog:

```jsx
// InvoiceList.jsx
const handleExport = async () => {
  const filePath = await window.api.showSaveDialog({
    defaultPath: `faturalar-${dayjs().format('YYYY-MM')}.xlsx`,
    filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }],
  });
  if (!filePath) return; // user cancelled
  await window.api.exportToExcel(filteredInvoices, filePath);
  message.success(`Dosya kaydedildi: ${filePath}`);
};
```

**Fix (B — quick):** At minimum, show a `message.success` with the path that was written:

```jsx
const filePath = await window.api.exportToExcel(filteredInvoices);
message.success({
  content: `Excel dosyası kaydedildi: ${filePath}`,
  duration: 6,
});
```

### 4.4 Column Visibility Toggle

**Why it's a problem:** Power users dealing with many invoices often want to hide columns they don't need (e.g., hide "Döviz" when all invoices are in TRY).

**Fix:** Use Ant Design Table's `columnTitle` with a `Popover` toggle (the pattern is built into Ant Design Pro's `ProTable`, which can be used standalone):

```jsx
const [visibleColumns, setVisibleColumns] = useState(
  allColumns.map(c => c.key)
);

const columns = allColumns.filter(c => visibleColumns.includes(c.key));
```

Add a column settings popover button above the table with checkboxes for each column.

### 4.5 Configurable Page Size

**Why it's a problem:** The pagination is fixed at a hardcoded size. Users with many invoices want to see more rows at once; users on smaller monitors want fewer.

**Fix:** Use Ant Design Table's built-in `showSizeChanger`:

```jsx
<Table
  pagination={{
    pageSize: pageSize,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    onShowSizeChange: (_, size) => setPageSize(size),
    showTotal: (total) => `Toplam ${total} fatura`,
  }}
/>
```

### 4.6 Row Expand for Quick Preview

**Why it's a problem:** Viewing a single invoice detail requires navigating away, waiting for the form to load, then navigating back. For read-only review this is unnecessary friction.

**Fix:** Add an `expandable` row that shows key invoice details inline:

```jsx
<Table
  expandable={{
    expandedRowRender: (record) => (
      <Descriptions size="small" column={4}>
        <Descriptions.Item label="Açıklama">{record.description || '—'}</Descriptions.Item>
        <Descriptions.Item label="KDV Tutarı">{record.vat_amount?.toFixed(2)} ₺</Descriptions.Item>
        <Descriptions.Item label="Kur">{record.try_equivalent?.rate ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="TRY Toplam">{record.try_equivalent?.total?.toFixed(2) ?? '—'} ₺</Descriptions.Item>
      </Descriptions>
    ),
  }}
/>
```

---

## 5. Invoice Form Page

### 5.1 `description` Field Is Missing

**Why it's a problem:** The data schema includes a `description` field and sample data uses it, but `InvoiceForm.jsx` has no input for it. Users have no way to add notes or additional context to an invoice through the UI.

**Fix:**

```jsx
// InvoiceForm.jsx — add after the invoice_no field
<Form.Item name="description" label="Açıklama">
  <Input.TextArea
    rows={2}
    maxLength={500}
    showCount
    placeholder="İsteğe bağlı not veya açıklama"
  />
</Form.Item>
```

Ensure the field is included in the submitted payload and initial form values when editing an existing invoice.

### 5.2 VAT Rate Selector Uses Outdated Rates

**Why it's a problem:** The current list `[0, 5, 10, 16, 20]` includes 16% (never a valid Turkish VAT rate) and is missing 1% and 8%. Users entering current invoices must use a wrong rate or none at all.

**Fix:**

```jsx
// Current Turkish rates as of 2023
const VAT_RATES = [
  { value: 0,  label: '%0' },
  { value: 1,  label: '%1' },
  { value: 8,  label: '%8 (2023 öncesi)' },
  { value: 10, label: '%10' },
  { value: 20, label: '%20' },
];

<Form.Item name="vat_rate" label="KDV Oranı" rules={[{ required: true }]}>
  <Select>
    {VAT_RATES.map(r => (
      <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
    ))}
  </Select>
</Form.Item>
```

### 5.3 No Unsaved Changes Warning

**Why it's a problem:** Clicking the browser back button or any navigation link while the form is dirty silently discards all entered data with no confirmation. This is a significant usability issue for long invoices.

**Fix:** Use React Router's navigation blocking:

```jsx
// InvoiceForm.jsx
import { useBlocker } from 'react-router-dom';

const [isDirty, setIsDirty] = useState(false);

useBlocker(({ currentLocation, nextLocation }) => {
  return isDirty && currentLocation.pathname !== nextLocation.pathname;
});

// Mark form dirty on any field change
<Form onValuesChange={() => setIsDirty(true)} onFinish={handleSubmit}>
```

On React Router v6.3 or earlier, use the `Prompt` component from `react-router-dom` v5-compat or implement via `window.onbeforeunload`:

```jsx
useEffect(() => {
  if (isDirty) {
    window.onbeforeunload = () => 'Kaydedilmemiş değişiklikler var. Çıkmak istediğinizden emin misiniz?';
  }
  return () => { window.onbeforeunload = null; };
}, [isDirty]);
```

### 5.4 Currency Selector: Show Inline FX Rate

**Why it's a problem:** When a user selects EUR or USD, the form displays amounts in that currency but there is no immediate indication of what the current TRY equivalent will be. Users must navigate to the FX Rates page to verify.

**Fix:** Show the current month's FX rate inline next to the currency selector:

```jsx
const [currentRate, setCurrentRate] = useState(null);

const handleCurrencyChange = async (currency) => {
  if (currency === 'TRY') { setCurrentRate(null); return; }
  const month = form.getFieldValue('date')?.format('YYYY-MM') ?? dayjs().format('YYYY-MM');
  const rate = await window.api.getFxRate(currency, month);
  setCurrentRate(rate);
};

// In JSX, next to the currency selector:
{currentRate && (
  <Typography.Text type="secondary">
    1 {currency} = {currentRate.toFixed(4)} ₺
  </Typography.Text>
)}
```

### 5.5 Missing FX Rate — Actionable Error

**Why it's a problem:** When the FX rate for the selected month is not configured, the form shows an error but gives no way to fix it from the current screen. Users must remember to navigate to FX Rates, add the rate, and come back.

**Fix:** Add a direct link to the FX Rates page in the error message:

```jsx
{missingFxRate && (
  <Alert
    type="warning"
    message={
      <>
        {dayjs(date).format('MMMM YYYY')} için {currency} kuru girilmemiş.{' '}
        <Link to="/fx-rates">Kur Ekle →</Link>
      </>
    }
    showIcon
  />
)}
```

### 5.6 Duplicate Invoice Number Warning

**Why it's a problem:** The form allows saving an invoice with a `invoice_no` that already exists. Duplicate invoice numbers cause confusion in searches, filters, and tax reports.

**Fix:** Add an async validator to the `invoice_no` field:

```jsx
<Form.Item
  name="invoice_no"
  label="Fatura No"
  rules={[
    { required: true },
    {
      validator: async (_, value) => {
        if (!value) return;
        const existing = await window.api.checkInvoiceNoExists(value, currentId);
        if (existing) return Promise.reject('Bu fatura numarası zaten kullanılıyor');
      },
    },
  ]}
>
  <Input />
</Form.Item>
```

Add `checkInvoiceNoExists(invoiceNo, excludeId)` to the IPC handlers and `DatabaseManager`.

### 5.7 Keyboard Shortcut for Save

**Why it's a problem:** Power users entering many invoices must reach for the mouse to click "Kaydet". Ctrl+S is a universal save shortcut that is expected in form-heavy applications.

**Fix:**

```jsx
// InvoiceForm.jsx
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      form.submit();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [form]);
```

---

## 6. FX Rates Page

### 6.1 Year Range Hardcoded to 2025–2030

**Why it's a problem:** Historical invoices from 2023 or 2024 need their FX rates entered, but those years are not in the dropdown. The app also silently breaks for 2031+.

**Fix:**

```jsx
// FxRates.jsx
const currentYear = dayjs().year();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
// Result: 5 years back, current year, 5 years forward
```

### 6.2 Three-Value Averaging UI Needs Explanation

**Why it's a problem:** The averaging input (entering 3 rate values that get averaged) is a clever feature for reconciling rates from multiple official sources (TCMB, BDDK, etc.), but its purpose is not obvious to new users.

**Fix:** Add a Tooltip or Popover explaining the feature:

```jsx
<Form.Item
  label={
    <span>
      Kur Değerleri{' '}
      <Tooltip title="3 farklı kaynaktan (ör. TCMB, banka) alınan kur değerlerinin ortalamasını otomatik hesaplar. Yalnızca tek değer girerseniz diğer alanları boş bırakabilirsiniz.">
        <QuestionCircleOutlined style={{ color: '#aaa' }} />
      </Tooltip>
    </span>
  }
>
```

### 6.3 Highlight Newly Saved Rate in Table

**Why it's a problem:** After saving a rate, the table refreshes but there is no visual indication of which row was just added or updated. Users must scan the table to verify the save worked.

**Fix:** Track the last saved rate and apply a CSS highlight class:

```jsx
const [lastSavedId, setLastSavedId] = useState(null);

const handleSave = async (values) => {
  const saved = await window.api.saveFxRate(values);
  setLastSavedId(saved.id);
  setTimeout(() => setLastSavedId(null), 3000); // remove highlight after 3s
};

// In table row class:
rowClassName={(record) => record.id === lastSavedId ? 'row-highlight' : ''}
```

```css
/* In App.css or a module */
.row-highlight td {
  background-color: #f6ffed !important;
  transition: background-color 3s ease;
}
```

### 6.4 Bulk Import from Excel/CSV

**Why it's a problem:** Entering 12 months of FX rates one by one is tedious. Users typically have this data in a spreadsheet from their accountant.

**Fix (MVP approach):** Add a "Toplu Aktar" button that opens a modal where users paste CSV text:

```jsx
// Parse pasted text: "2024-01,32.45\n2024-02,32.88\n..."
const parsePastedRates = (text) =>
  text.trim().split('\n').map(line => {
    const [month, rate] = line.split(',');
    return { month: month.trim(), rate: parseFloat(rate) };
  });
```

---

## 7. Global / App Shell

### 7.1 Replace "Ales" Logo Placeholder

**Why it's a problem:** The sidebar logo currently renders the text "Ales" — an obvious placeholder from a CRA template. This affects the professional feel of the app on every page.

**Fix:** Replace the placeholder text in `App.js` with the actual app name (or a logo image):

```jsx
// App.js
<div className="logo">
  <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
    TaxTracker
  </Typography.Title>
</div>
```

### 7.2 Add a Settings Page

**Why it's a problem:** There is no Settings page. Even basic preferences (date display format, default currency, fiscal year start month) must be hardcoded.

**Minimum viable settings page:**
- Default currency (TRY / USD / EUR)
- Date format preference (DD/MM/YYYY vs YYYY-MM-DD)
- App theme (light / dark — Ant Design supports this natively via `ConfigProvider`)

Use `electron-store` to persist settings and expose via IPC.

### 7.3 Toast Messages Need More Context

**Why it's a problem:** Success messages like "Fatura silindi" don't identify which invoice was deleted. If a user accidentally deletes the wrong item, they have no way to confirm what was just removed before the message disappears.

**Fix:** Include the invoice number or company name in the message:

```jsx
// Before:
message.success('Fatura silindi');

// After:
message.success(`"${invoice.invoice_no}" numaralı fatura silindi`);
```

### 7.4 Add an "About" Section

**Why it's a problem:** There is no way for users to see the app version, check for updates, or find support information.

**Fix:** Add a small About entry at the bottom of the sidebar or in a Settings page:

```jsx
// App.js — at the bottom of the Sider
<div style={{ padding: '16px', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
  TaxTracker v{process.env.npm_package_version}
</div>
```

Expose the version via `ipcMain` or `preload.js` so the renderer can display it:

```js
// preload.js
getAppVersion: () => ipcRenderer.invoke('get-app-version'),

// main.js
ipcMain.handle('get-app-version', () => app.getVersion());
```

---

## 8. Accessibility

### 8.1 Icon-Only Buttons Need `aria-label`

**Why it's a problem:** Edit and Delete buttons in the invoice table use only icons (`<EditOutlined />`, `<DeleteOutlined />`). Screen readers announce them as unlabeled buttons, making the table unusable with assistive technology.

**Fix:**

```jsx
// InvoiceList.jsx — table action column
<Button
  icon={<EditOutlined />}
  aria-label={`${record.invoice_no} faturasını düzenle`}
  onClick={() => navigate(`/invoices/${record.id}`)}
/>
<Button
  icon={<DeleteOutlined />}
  aria-label={`${record.invoice_no} faturasını sil`}
  danger
  onClick={() => handleDelete(record)}
/>
```

### 8.2 Invoice Type Tags: Color Is the Only Differentiator

**Why it's a problem:** Income vs. Expense invoices are distinguished only by tag color (blue vs. green). Users with color blindness cannot tell them apart, and the tags carry no text hint.

**Fix:** Add an icon or a text label alongside the color:

```jsx
const typeConfig = {
  income:  { color: 'blue',  icon: <ArrowDownOutlined />, label: 'Gelir' },
  expense: { color: 'green', icon: <ArrowUpOutlined />,   label: 'Gider' },
};

<Tag color={typeConfig[record.type].color} icon={typeConfig[record.type].icon}>
  {typeConfig[record.type].label}
</Tag>
```

---

## 9. Responsive Design

### 9.1 Minimum Width Assumption

The app uses a fixed 200px sidebar and `Col span={6}` grid columns throughout. At window widths below ~1100px (common on 13" laptops), content starts to overflow or wrap poorly.

**Fix:** Add responsive span overrides using Ant Design's grid breakpoints:

```jsx
// Instead of: <Col span={6}>
<Col xs={24} sm={12} md={8} lg={6}>
```

### 9.2 InvoiceForm Breaks at Small Widths

`InvoiceForm` uses a 4-column layout (`Col span={6}`) for all fields. On small windows, fields become too narrow to use comfortably.

**Fix:** Use responsive grid spans specifically for the form:

```jsx
const formColProps = { xs: 24, sm: 12, lg: 6 };

<Row gutter={[16, 0]}>
  <Col {...formColProps}>
    <Form.Item name="invoice_no" label="Fatura No" ...>
  </Col>
  <Col {...formColProps}>
    <Form.Item name="date" label="Tarih" ...>
  </Col>
  {/* ... */}
</Row>
```

---

## 10. Implementation Priority

The table below ranks improvements by **user impact** (how much it affects daily workflows) and **implementation effort** (time + complexity). Address high-impact, low-effort items first.

| Improvement | Impact | Effort | Priority |
|---|---|---|---|
| Navigation active state fix | High | Low | 🥇 Do first |
| Remove `console.log` calls | High | Low | 🥇 Do first |
| Dashboard loading state | High | Low | 🥇 Do first |
| `description` field in InvoiceForm | High | Low | 🥇 Do first |
| Replace "Ales" logo placeholder | Medium | Low | 🥇 Do first |
| VAT rate list update | High | Low | 🥇 Do first |
| FX rate year range dynamic | Medium | Low | 🥇 Do first |
| Toast messages with context | Medium | Low | 🥇 Do first |
| Excel export save dialog | High | Low | 🥈 Next sprint |
| Unsaved changes warning | High | Medium | 🥈 Next sprint |
| Missing FX rate actionable error | High | Medium | 🥈 Next sprint |
| Dashboard empty state | Medium | Low | 🥈 Next sprint |
| Date range filter persistence | Medium | Low | 🥈 Next sprint |
| Duplicate invoice number warning | Medium | Medium | 🥈 Next sprint |
| Ctrl+S keyboard shortcut | Medium | Low | 🥈 Next sprint |
| Net VAT Position card | High | Medium | 🥈 Next sprint |
| Highlight saved FX rate row | Medium | Medium | 🥈 Next sprint |
| `aria-label` on icon buttons | Medium | Low | 🥈 Next sprint |
| Invoice type tag with icon | Medium | Low | 🥈 Next sprint |
| Inline FX rate display | Medium | Medium | 🥉 Later |
| Row expand preview | Medium | Medium | 🥉 Later |
| Column visibility toggle | Low | Medium | 🥉 Later |
| Breadcrumb navigation | Low | Low | 🥉 Later |
| Configurable page size | Low | Low | 🥉 Later |
| FX rate bulk CSV import | Medium | High | 🥉 Later |
| FX rate averaging tooltip | Low | Low | 🥉 Later |
| Chart currency tooltips | Low | Medium | 🥉 Later |
| Period comparison cards | Medium | High | 🥉 Later |
| Settings page | Medium | High | 🥉 Later |
| About section | Low | Low | 🥉 Later |
| Responsive layout | Low | High | 🥉 Later |
