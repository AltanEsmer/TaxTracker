# Frontend Design Implementation Skill

## Purpose
Apply design handoffs to the TaxTracker Electron/React codebase. This skill governs how design changes are translated into code without touching business logic.

## Stack Constraints
- **UI library**: Ant Design 5 only — no other component libraries
- **Styling**: CSS variables in `src/index.css` + Ant Design `ConfigProvider` token overrides in `App.js`
- **Fonts**: Inter via `@fontsource/inter` (already installed)
- **Charts**: Chart.js via `react-chartjs-2` (already installed)
- **Theme**: light/dark toggle via `data-theme` attribute on `<html>`; dark overrides live in `[data-theme="dark"]` block in `index.css`
- **Icons**: `@ant-design/icons` only
- **Routing**: HashRouter — never switch to BrowserRouter

## Design Token System
Tokens live in two places — keep them in sync:
1. CSS custom properties in `src/index.css` (`:root` + `[data-theme="dark"]`)
2. Ant Design `theme.token` and `theme.components` in `App.js` `antTheme` object

When updating a color/spacing/radius, update **both** locations.

## File Map
| Concern | File |
|---|---|
| Global tokens & base styles | `src/index.css` |
| Ant Design theme + layout shell | `src/App.js` |
| Dashboard page | `src/pages/Dashboard.js` |
| Invoice list | `src/pages/InvoiceList.js` |
| Invoice add/edit form | `src/pages/InvoiceForm.js` |
| FX rate management | `src/pages/FxRates.js` |
| KDV rate settings | `src/pages/KdvSettings.js` |
| Shared error boundary | `src/components/ErrorBoundary.jsx` |

## Implementation Rules

### Layout
- Sidebar width: 220px expanded, 64px collapsed (CSS var `--sidebar-width` / `--sidebar-width-collapsed`)
- Content max-width: 1440px, padding 24px (`var(--space-6)`)
- Page header: flex row, title left, actions right, `margin-bottom: var(--space-6)`

### Cards
- Use `.card` class or Ant Design `<Card>` with `className="dashboard-card"`
- Border-radius: `var(--radius-lg)` (12px)
- Border: `1px solid var(--color-border)`
- Shadow: `var(--shadow-xs)` → `var(--shadow-sm)` on hover

### KPI Cards
- Left border accent: `3px solid var(--color-accent)` (blue), `.success` (green), `.danger` (red)
- Stat title: uppercase, 12px, `var(--color-text-secondary)`
- Stat value: 28px bold, `var(--color-text-primary)`

### Buttons
- Primary: `type="primary"` (Ant Design) — blue, no shadow
- Secondary: `type="default"` with border
- Danger: `type="primary" danger`
- All border-radius: `var(--radius-md)` (8px)

### Tags / Badges
- Alış (purchase): `.tag-alis` class — blue on `#EFF6FF`
- Satış (sale): `.tag-satis` class — green on `#F0FDF4`
- Shape: `border-radius: var(--radius-full)` (pill)

### Tables
- Header: `#F1F5F9` bg, uppercase 11px labels, `var(--color-text-secondary)`
- Rows: fade-in animation `fadeInRow` (already defined in index.css)
- Hover: `var(--color-bg-subtle)`

### Forms
- Layout: `"vertical"` for all forms
- Input bg at rest: `var(--color-bg-subtle)` → white on focus
- Focus ring: `var(--shadow-focus)` (3px blue ring)
- Required asterisk: `var(--color-danger)`

### Dark Mode
When adding new CSS, always add the dark-mode override in `[data-theme="dark"]` block.
For Ant Design components, the `ConfigProvider` does **not** auto-switch — handle via CSS variables.

## Agentic Orchestration Pattern
For large design changes (3+ pages), spawn parallel sub-agents (claude-sonnet-4-6):
- Agent A: `src/index.css` + `src/App.js` (tokens, layout shell)
- Agent B: `src/pages/Dashboard.js`
- Agent C: `src/pages/InvoiceList.js` + `src/pages/InvoiceForm.js`
- Agent D: `src/pages/FxRates.js` + `src/pages/KdvSettings.js`

Each agent reads the relevant files first, then applies only the design changes for its scope. Do not touch IPC calls, data fetching, or business logic.

## Quality Checklist (before commit)
- [ ] All new color/spacing values reference CSS variables, not hardcoded hex
- [ ] Dark mode overrides added for any new CSS variables
- [ ] No layout shifts — widths use flex/grid, not magic pixel values
- [ ] Ant Design token changes reflected in both `antTheme` and `:root`
- [ ] Turkish strings preserved — no English replacements
- [ ] No new npm packages added unless unavoidable
- [ ] `npm run react-build` passes without errors
