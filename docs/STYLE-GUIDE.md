# TaxTracker — Style Modernization Guide

> **Goal:** Transform the current Ant Design 5 / React app from a visually dated interface into a clean, modern 2025 financial dashboard — without changing any business logic.

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Design Principles](#2-design-principles)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Component Overhaul](#7-component-overhaul)
8. [Dark Mode](#8-dark-mode)
9. [Animations & Microinteractions](#9-animations--microinteractions)
10. [CSS Variables (Design Tokens)](#10-css-variables-design-tokens)
11. [Ant Design Theme Config](#11-ant-design-theme-config)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Current State Audit

### What's outdated

| Issue | Where | Impact |
|---|---|---|
| Ant Design default blue `#1890ff` primary | All buttons, links, form focus | Feels generic and dated |
| Heavy purple-blue gradient on every chart card header | `Dashboard.js` `.chart-container` | Visually noisy, clashes with data |
| System font stack (no dedicated typeface) | `index.css` body | Inconsistent rendering across platforms |
| Hardcoded hex colors scattered in JSX inline styles | All components | No theme consistency, impossible to maintain |
| No CSS custom properties (zero variables) | `index.css` | Can't support theming or dark mode |
| No dark mode | Entire app | Eye strain, feels old for a desktop app |
| 28px bold statistic numbers with no visual hierarchy context | `Dashboard.js` | Metrics feel disconnected, no supporting context |
| Fixed `max-width: 800px` form with no responsive consideration | `InvoiceForm.js` | Breaks at non-standard Electron window sizes |
| Chart headers use a loud gradient, card body is plain white | `Dashboard.js` | Disjointed — header and content look unrelated |
| Inline style objects for every small text helper | All components | Noise in JSX, no reuse |

### What to keep

- Ant Design component structure (Table, Form, DatePicker, etc.) — solid and well-tested
- The semantic color intent: blue = purchases, green/red = sales
- The card-based layout grid
- Existing transitions (upgrade them, don't remove)

---

## 2. Design Principles

These four principles drive every decision below.

**1. Clarity over decoration**
Data is the product. Every style choice must make numbers easier to read, not compete with them. Remove gradients and heavy shadows that distract from content.

**2. Single accent, neutral base**
One brand accent color on a calm neutral background. The accent appears on interactive elements and key metrics only — not on every heading or card.

**3. Systematic tokens**
All colors, radii, fonts, and spacing live as CSS variables. No hardcoded values in components. This makes theming, dark mode, and future redesigns trivial.

**4. Desktop-first, not desktop-only**
The Electron window can be resized. Layouts must flex gracefully from ~960 px to ~1600 px without breaking.

---

## 3. Color System

### New Palette

```css
/* ─── Brand ─────────────────────────────── */
--color-accent:        #2563EB;   /* Modern blue — primary actions, links */
--color-accent-hover:  #1D4ED8;   /* Darker on hover */
--color-accent-subtle: #EFF6FF;   /* Tinted bg for accent areas */

/* ─── Semantic ──────────────────────────── */
--color-success:       #16A34A;   /* Positive values, Satış invoices */
--color-success-bg:    #F0FDF4;
--color-danger:        #DC2626;   /* Errors, delete, negative values */
--color-danger-bg:     #FEF2F2;
--color-warning:       #D97706;   /* Warnings, overdue */
--color-warning-bg:    #FFFBEB;

/* ─── Neutrals (Light Mode) ─────────────── */
--color-bg-base:       #F8FAFC;   /* Page background */
--color-bg-card:       #FFFFFF;   /* Card / panel background */
--color-bg-subtle:     #F1F5F9;   /* Table header, hover rows, input bg */
--color-border:        #E2E8F0;   /* All borders, dividers */
--color-border-strong: #CBD5E1;   /* Focused input borders */

/* ─── Text ──────────────────────────────── */
--color-text-primary:  #0F172A;   /* Main body text */
--color-text-secondary:#475569;   /* Secondary labels, helpers */
--color-text-muted:    #94A3B8;   /* Placeholders, disabled */
--color-text-inverse:  #FFFFFF;   /* Text on dark/accent backgrounds */
```

### Why these changes

| Old | New | Reason |
|---|---|---|
| `#1890ff` (Ant default) | `#2563EB` | Ant's blue reads "template". The new blue is richer, more distinct, and passes WCAG AA at 4.6:1 on white. |
| `#667eea → #764ba2` gradient | Flat `#F8FAFC` page bg | Gradient chart headers drew the eye away from the chart data itself. |
| `#fafafa` table header | `#F1F5F9` (Slate-100) | Slightly cooler tone creates better contrast with white card body. |
| White card on white page | `#FFFFFF` card on `#F8FAFC` page | The ~2% luminance difference creates depth without a heavy shadow. |

### Chart Color Palette (replace rgba soup)

Use opaque colors with consistent alpha for all charts — predictable and accessible:

```js
// Alış (Purchase) series
const PURCHASE_COLORS = {
  TRY: '#2563EB',   // Blue
  USD: '#0891B2',   // Cyan
  EUR: '#7C3AED',   // Violet
};

// Satış (Sales) series
const SALES_COLORS = {
  TRY: '#16A34A',   // Green
  USD: '#D97706',   // Amber
  EUR: '#DC2626',   // Red
};
```

---

## 4. Typography

### Font: Inter

Replace the system font stack with **Inter** — the standard for modern financial/dashboard UIs in 2025. It was designed specifically for screens, has excellent number rendering, and is free.

**Add to `public/index.html`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Or self-host** (recommended for Electron — no network required):
```
npm install @fontsource/inter
```
Then in `index.css`:
```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
```

### Type Scale

```css
--font-family:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-size-xs:       11px;   /* Micro labels, table subtotals */
--font-size-sm:       12px;   /* Helper text, secondary data */
--font-size-base:     14px;   /* Body, table cells, form fields */
--font-size-md:       15px;   /* Slightly prominent labels */
--font-size-lg:       18px;   /* Card titles, section headings */
--font-size-xl:       22px;   /* Page titles */
--font-size-2xl:      28px;   /* Dashboard KPI numbers */
--font-size-3xl:      36px;   /* Primary total (e.g., annual tax) */

--font-weight-normal:   400;
--font-weight-medium:   500;
--font-weight-semibold: 600;
--font-weight-bold:     700;

--line-height-tight:  1.25;
--line-height-base:   1.5;
--line-height-loose:  1.75;

--letter-spacing-tight: -0.02em;  /* Large KPI numbers */
--letter-spacing-wide:   0.04em;  /* ALL-CAPS labels */
```

### Hierarchy Rules

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title (h1) | `--font-size-xl` | 600 | `--color-text-primary` |
| Section heading (h2) | `--font-size-lg` | 600 | `--color-text-primary` |
| Card title | `--font-size-base` | 600 | `--color-text-primary` |
| Body / table cell | `--font-size-base` | 400 | `--color-text-primary` |
| Label / helper | `--font-size-sm` | 400 | `--color-text-secondary` |
| Micro caption | `--font-size-xs` | 400 | `--color-text-muted` |
| KPI number | `--font-size-2xl` | 700 | `--color-text-primary` |
| KPI label | `--font-size-sm` | 500 | `--color-text-secondary` |

---

## 5. Spacing & Layout

### Spacing Scale

Use a base-4 scale (4 px grid). Every margin, padding, and gap should be a multiple of 4.

```css
--space-1:   4px;
--space-2:   8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Layout Changes

**Sidebar navigation** (replace top horizontal menu)

The current top `<Layout.Header>` with a horizontal `<Menu>` wastes vertical space and doesn't scale with more menu items. Replace with a collapsible left sidebar:

```
┌─────────┬──────────────────────────────────────┐
│  Logo   │                                      │
│─────────│          Page Content                │
│ 🏠 Dash │                                      │
│ 📄 Fatu │                                      │
│ ➕ Yeni │                                      │
│ 💱 Kur  │                                      │
│         │                                      │
│─────────│                                      │
│ Settings│                                      │
└─────────┴──────────────────────────────────────┘
```

- Sidebar width: **220 px** expanded, **64 px** collapsed (icon only)
- Collapse trigger: chevron button at the bottom of the sidebar
- Active item: accent-colored left border + subtle accent background

**Page layout:**
```css
.page-wrapper {
  padding: var(--space-6);          /* 24px all sides */
  max-width: 1440px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}
```

**Content grid:**
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);              /* 16px */
}

.chart-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;  /* Bar chart wide, pie chart narrow */
  gap: var(--space-4);
}
```

---

## 6. Elevation & Shadows

### Shadow Scale

Replace the current two ad-hoc shadows with a consistent scale:

```css
--shadow-xs:  0 1px 2px  0 rgba(15, 23, 42, 0.05);
--shadow-sm:  0 1px 3px  0 rgba(15, 23, 42, 0.08),
              0 1px 2px -1px rgba(15, 23, 42, 0.06);
--shadow-md:  0 4px 6px -1px rgba(15, 23, 42, 0.08),
              0 2px 4px -2px rgba(15, 23, 42, 0.06);
--shadow-lg:  0 10px 15px -3px rgba(15, 23, 42, 0.08),
              0 4px 6px  -4px rgba(15, 23, 42, 0.04);
--shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.2);   /* Focus ring */
```

### Usage

| Element | Shadow |
|---|---|
| Sidebar | `--shadow-md` (right edge only) |
| Cards (default) | `--shadow-xs` |
| Cards (hover) | `--shadow-sm` |
| Modals / drawers | `--shadow-lg` |
| Input focus | `--shadow-focus` |
| Buttons | none (flat) |

**Remove:**
- `translateY(-4px)` lift on dashboard card hover — too bouncy for a finance app
- The current `0 4px 12px rgba(0,0,0,0.15)` cards — the dark base color creates muddiness

---

## 7. Component Overhaul

### 7.1 Cards

**Current:** White card, gradient header, heavy shadow, translateY hover.

**New:**
```css
.card {
  background:    var(--color-bg-card);
  border:        1px solid var(--color-border);
  border-radius: var(--radius-lg);      /* 12px */
  box-shadow:    var(--shadow-xs);
  transition:    box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding:       var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  font-size:     var(--font-size-base);
  font-weight:   var(--font-weight-semibold);
  color:         var(--color-text-primary);
  /* NO gradient — clean, flat header */
}

.card-body {
  padding: var(--space-5);
}
```

**KPI / Statistic cards** get a left accent border instead of a colored top gradient:
```css
.kpi-card {
  border-left: 3px solid var(--color-accent);
}
.kpi-card.success { border-left-color: var(--color-success); }
.kpi-card.danger  { border-left-color: var(--color-danger);  }
```

### 7.2 Buttons

```css
/* Primary */
.btn-primary {
  background:    var(--color-accent);
  color:         var(--color-text-inverse);
  border:        none;
  border-radius: var(--radius-md);    /* 8px */
  font-weight:   var(--font-weight-medium);
  padding:       var(--space-2) var(--space-4);
  transition:    background 0.15s ease, box-shadow 0.15s ease;
}
.btn-primary:hover  { background: var(--color-accent-hover); }
.btn-primary:focus  { box-shadow: var(--shadow-focus); }

/* Secondary */
.btn-secondary {
  background:    transparent;
  color:         var(--color-text-primary);
  border:        1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}
.btn-secondary:hover { background: var(--color-bg-subtle); }

/* Danger (Delete) */
.btn-danger {
  background: transparent;
  color:      var(--color-danger);
  border:     1px solid var(--color-danger);
}
```

### 7.3 Navigation (Sidebar)

```css
.sidebar {
  width:      220px;
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  display:    flex;
  flex-direction: column;
  transition: width 0.2s ease;
}

.sidebar.collapsed { width: 64px; }

.nav-item {
  display:       flex;
  align-items:   center;
  gap:           var(--space-3);
  padding:       var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color:         var(--color-text-secondary);
  font-weight:   var(--font-weight-medium);
  font-size:     var(--font-size-base);
  cursor:        pointer;
  transition:    background 0.15s, color 0.15s;
  margin:        var(--space-1) var(--space-2);
}

.nav-item:hover {
  background: var(--color-bg-subtle);
  color:      var(--color-text-primary);
}

.nav-item.active {
  background:  var(--color-accent-subtle);
  color:       var(--color-accent);
  border-left: 3px solid var(--color-accent);
}
```

### 7.4 Data Tables

```css
.ant-table-thead > tr > th {
  background:    var(--color-bg-subtle) !important;
  color:         var(--color-text-secondary) !important;
  font-size:     var(--font-size-xs) !important;
  font-weight:   var(--font-weight-semibold) !important;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  border-bottom: 2px solid var(--color-border) !important;
}

.ant-table-tbody > tr > td {
  font-size:  var(--font-size-base);
  color:      var(--color-text-primary);
  border-bottom: 1px solid var(--color-border) !important;
}

.ant-table-tbody > tr:hover > td {
  background: var(--color-bg-subtle) !important;
}
```

### 7.5 Invoice Type Tags

```css
/* Replace Ant Tag default colors with semantic tokens */
.tag-alis  { /* Purchases */
  background: var(--color-accent-subtle);
  color:      var(--color-accent);
  border:     1px solid #BFDBFE;
  border-radius: var(--radius-full);
  padding: 2px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.tag-satis { /* Sales */
  background: var(--color-success-bg);
  color:      var(--color-success);
  border:     1px solid #BBF7D0;
}
```

### 7.6 Form Fields

```css
.ant-input,
.ant-input-number,
.ant-select-selector,
.ant-picker {
  border-radius: var(--radius-md) !important;
  border-color:  var(--color-border) !important;
  background:    var(--color-bg-subtle) !important;
  font-size:     var(--font-size-base) !important;
  transition:    border-color 0.15s, box-shadow 0.15s !important;
}

.ant-input:focus,
.ant-input-number-focused,
.ant-select-focused .ant-select-selector,
.ant-picker-focused {
  border-color: var(--color-accent) !important;
  box-shadow:   var(--shadow-focus) !important;
  background:   var(--color-bg-card) !important;
}
```

### 7.7 Dashboard KPI Cards

Replace the plain `<Statistic>` blocks with structured KPI cards:

```
┌─────────────────────────────┐
│ TOPLAM KDV           ↑ 12%  │  ← label + trend badge
│                             │
│ ₺ 124,850.00                │  ← large number
│ ─────────────────           │
│ 3,842 fatura                │  ← sub-metric
└─────────────────────────────┘
```

**Key changes:**
- Label in uppercase, small, muted — above the number
- Number uses `--font-size-2xl`, `letter-spacing: -0.02em`
- Trend badge: green pill for positive delta, red for negative
- Thin accent-colored bottom border to distinguish card types

---

## 8. Dark Mode

Add full dark mode support using CSS variable overrides on `[data-theme="dark"]`.

### Dark palette override

```css
[data-theme="dark"] {
  --color-bg-base:        #0F172A;
  --color-bg-card:        #1E293B;
  --color-bg-subtle:      #293548;
  --color-border:         #334155;
  --color-border-strong:  #475569;

  --color-text-primary:   #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-muted:     #64748B;

  --color-accent-subtle:  #1E3A5F;
  --color-success-bg:     #14532D;
  --color-danger-bg:      #450A0A;
  --color-warning-bg:     #451A03;
}
```

### Toggle implementation

```js
// In App.js or a ThemeContext
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('taxtracker-theme', theme);
}

// On load
const saved = localStorage.getItem('taxtracker-theme')
  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(saved);
```

Add a sun/moon toggle icon button in the sidebar footer.

---

## 9. Animations & Microinteractions

Keep animations subtle and purposeful — financial apps demand trust, not flair.

```css
/* Global transition defaults */
:root {
  --transition-fast:   0.1s ease;
  --transition-base:   0.2s ease;
  --transition-slow:   0.35s ease;
}

/* Number count-up on KPI cards (use CountUp.js or CSS) */
.kpi-number {
  transition: color var(--transition-base);
}

/* Table row reveal on load */
@keyframes fadeInRow {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ant-table-tbody > tr {
  animation: fadeInRow 0.2s ease both;
}

/* Button press feedback */
.btn-primary:active {
  transform: scale(0.98);
}

/* Page transition (React Router) */
.page-enter {
  opacity: 0;
  transform: translateY(6px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
```

**What to remove:**
- `translateY(-4px)` card hover lift (too playful)
- Keep: shadow transition on card hover (subtle, useful depth cue)

---

## 10. CSS Variables (Design Tokens)

Replace `src/index.css` with this complete token file:

```css
/* src/index.css — TaxTracker Design Tokens */

@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';

:root {
  /* ── Brand ─────────────────────── */
  --color-accent:         #2563EB;
  --color-accent-hover:   #1D4ED8;
  --color-accent-subtle:  #EFF6FF;

  /* ── Semantic ──────────────────── */
  --color-success:        #16A34A;
  --color-success-bg:     #F0FDF4;
  --color-danger:         #DC2626;
  --color-danger-bg:      #FEF2F2;
  --color-warning:        #D97706;
  --color-warning-bg:     #FFFBEB;

  /* ── Neutrals ──────────────────── */
  --color-bg-base:        #F8FAFC;
  --color-bg-card:        #FFFFFF;
  --color-bg-subtle:      #F1F5F9;
  --color-border:         #E2E8F0;
  --color-border-strong:  #CBD5E1;

  /* ── Text ──────────────────────── */
  --color-text-primary:   #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted:     #94A3B8;
  --color-text-inverse:   #FFFFFF;

  /* ── Typography ────────────────── */
  --font-family:          'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-xs:         11px;
  --font-size-sm:         12px;
  --font-size-base:       14px;
  --font-size-md:         15px;
  --font-size-lg:         18px;
  --font-size-xl:         22px;
  --font-size-2xl:        28px;
  --font-size-3xl:        36px;
  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;
  --line-height-base:     1.5;
  --letter-spacing-tight: -0.02em;
  --letter-spacing-wide:   0.04em;

  /* ── Spacing ───────────────────── */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius ─────────────── */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* ── Shadows ───────────────────── */
  --shadow-xs:    0 1px 2px 0 rgba(15, 23, 42, 0.05);
  --shadow-sm:    0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.06);
  --shadow-md:    0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06);
  --shadow-lg:    0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04);
  --shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.2);

  /* ── Transitions ───────────────── */
  --transition-fast: 0.1s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.35s ease;

  /* ── Layout ────────────────────── */
  --sidebar-width:           220px;
  --sidebar-width-collapsed:  64px;
  --header-height:            64px;
  --content-max-width:      1440px;
}

/* ── Dark mode overrides ─────────────────── */
[data-theme="dark"] {
  --color-bg-base:        #0F172A;
  --color-bg-card:        #1E293B;
  --color-bg-subtle:      #293548;
  --color-border:         #334155;
  --color-border-strong:  #475569;
  --color-text-primary:   #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-muted:     #64748B;
  --color-accent-subtle:  #1E3A5F;
  --color-success-bg:     #14532D;
  --color-danger-bg:      #450A0A;
  --color-warning-bg:     #451A03;
}

/* ── Global base ─────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
}

body {
  font-family:             var(--font-family);
  font-size:               var(--font-size-base);
  font-weight:             var(--font-weight-normal);
  line-height:             var(--line-height-base);
  color:                   var(--color-text-primary);
  background-color:        var(--color-bg-base);
  -webkit-font-smoothing:  antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 11. Ant Design Theme Config

Replace any existing `theme` prop on `<ConfigProvider>` in `App.js` with:

```js
// src/App.js
import { ConfigProvider } from 'antd';

const antTheme = {
  token: {
    // Brand
    colorPrimary:      '#2563EB',
    colorSuccess:      '#16A34A',
    colorError:        '#DC2626',
    colorWarning:      '#D97706',

    // Typography
    fontFamily:        "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize:          14,
    fontSizeLG:        16,
    fontSizeXL:        20,

    // Borders
    borderRadius:       8,
    borderRadiusLG:    12,
    borderRadiusSM:     4,

    // Colors
    colorBgContainer:  '#FFFFFF',
    colorBgLayout:     '#F8FAFC',
    colorBorder:       '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    colorText:         '#0F172A',
    colorTextSecondary:'#475569',
    colorTextTertiary: '#94A3B8',

    // Shadows
    boxShadow:  '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    boxShadowSecondary: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',

    // Spacing
    padding:     16,
    paddingLG:   24,
    paddingSM:   12,
    paddingXS:    8,
    margin:      16,
    marginLG:    24,

    // Sizing
    controlHeight:   36,
    controlHeightLG: 40,
    controlHeightSM: 28,
  },
  components: {
    Layout: {
      headerBg:   '#FFFFFF',
      siderBg:    '#FFFFFF',
      bodyBg:     '#F8FAFC',
      headerHeight: 64,
    },
    Menu: {
      itemBg:             'transparent',
      itemSelectedBg:     '#EFF6FF',
      itemSelectedColor:  '#2563EB',
      itemHoverBg:        '#F1F5F9',
      itemHoverColor:     '#0F172A',
      itemColor:          '#475569',
      itemHeight:         40,
      iconSize:           16,
    },
    Table: {
      headerBg:           '#F1F5F9',
      headerColor:        '#475569',
      rowHoverBg:         '#F8FAFC',
      borderColor:        '#E2E8F0',
    },
    Card: {
      headerBg:           '#FFFFFF',
      paddingLG:           20,
    },
    Button: {
      primaryShadow:       'none',
      defaultShadow:       'none',
      dangerShadow:        'none',
    },
    Input: {
      activeBorderColor:  '#2563EB',
      activeShadow:       '0 0 0 3px rgba(37, 99, 235, 0.2)',
    },
    DatePicker: {
      activeBorderColor:  '#2563EB',
      activeShadow:       '0 0 0 3px rgba(37, 99, 235, 0.2)',
    },
  },
};

// Usage:
<ConfigProvider theme={antTheme}>
  <App />
</ConfigProvider>
```

---

## 12. Implementation Checklist

Work through these in order — each step builds on the previous.

### Phase 1 — Foundation (no visible changes yet)
- [ ] Install `@fontsource/inter` — `npm install @fontsource/inter`
- [ ] Replace `src/index.css` with the full token file from Section 10
- [ ] Add `ConfigProvider` with theme from Section 11 to `App.js`
- [ ] Verify app still runs — no style regressions

### Phase 2 — Layout
- [ ] Convert `<Layout.Header>` horizontal menu → `<Layout.Sider>` vertical sidebar
- [ ] Add sidebar collapse toggle (chevron button at bottom)
- [ ] Update active nav item styles with accent left-border
- [ ] Move dark mode toggle to sidebar footer
- [ ] Update page wrapper padding and max-width

### Phase 3 — Cards & Dashboard
- [ ] Remove gradient from `.chart-container .ant-card-head` — use flat card header
- [ ] Add `border-left` KPI accent to statistic cards
- [ ] Implement structured KPI card layout (label → number → sub-metric)
- [ ] Replace rgba chart colors with the new `PURCHASE_COLORS` / `SALES_COLORS` constants
- [ ] Change page background from white to `--color-bg-base` (`#F8FAFC`)

### Phase 4 — Components
- [ ] Apply new button styles (remove Ant default shadows)
- [ ] Update table header styles (uppercase, small, muted)
- [ ] Replace invoice type Tags with new pill styles
- [ ] Update form field backgrounds to `--color-bg-subtle`
- [ ] Remove `translateY` hover from dashboard cards

### Phase 5 — Dark Mode
- [ ] Implement `applyTheme()` function and localStorage persistence
- [ ] Add system preference detection on startup
- [ ] Test all pages in dark mode
- [ ] Adjust Chart.js colors for dark mode (use `window.matchMedia` in chart config)

### Phase 6 — Polish
- [ ] Add `fadeInRow` animation to table rows
- [ ] Add page transition animation with React Router
- [ ] Audit all inline style objects — move to CSS classes or CSS variables
- [ ] Run a contrast-ratio check on all text/background pairs (target: WCAG AA, 4.5:1 min)

---

*Sources: [Uitop Dashboard Trends 2025](https://uitop.design/blog/design/top-dashboard-design-trends/) · [GraphicEagle Fintech UX 2025](https://www.graphiceagle.com/top-ui-ux-trends-in-fintech-products-2025-design-innovations-for-better-finance-apps/) · [FreeCodeCamp Tailwind + Electron](https://www.freecodecamp.org/news/integrate-tailwind-with-electron/) · [Inter Font](https://rsms.me/inter/) · [Ant Design 5 Theme](https://ant.design/docs/react/customize-theme)*
