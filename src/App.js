/* TaxTracker — App shell (Quiet Premium) */

import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, ConfigProvider, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  SwapOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { lightTheme, darkTheme } from './theme';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import FxRates from './pages/FxRates';
import { ErrorBoundary } from './components/ErrorBoundary';

const { Sider, Header, Content } = Layout;

export const TopBarContext = React.createContext({ setRight: () => {} });

/* ---------- Brand mark (stacked ledger rows) ---------- */
function TTMark({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4"  y="6"  width="24" height="4" rx="1.5" fill={color} />
      <rect x="9"  y="13" width="14" height="4" rx="1.5" fill={color} />
      <rect x="14" y="20" width="4"  height="8" rx="1.5" fill={color} />
    </svg>
  );
}

/* ---------- Route → selected key ---------- */
function getSelectedKey(pathname) {
  if (pathname.startsWith('/invoices/new'))  return '/invoices/new';
  if (pathname.startsWith('/invoices/edit')) return '/invoices';
  if (pathname.startsWith('/invoices'))      return '/invoices';
  if (pathname.startsWith('/fx-rates'))      return '/fx-rates';
  return '/';
}

/* ---------- Topbar title map ---------- */
const TITLE_MAP = [
  { match: '/invoices/new',  title: 'Yeni Fatura',    crumb: ['Faturalar', 'Yeni Fatura'] },
  { match: '/invoices/edit', title: 'Fatura Düzenle', crumb: ['Faturalar', 'Fatura Düzenle'] },
  { match: '/invoices',      title: 'Faturalar',      crumb: ['Genel', 'Faturalar'] },
  { match: '/fx-rates',      title: 'Kur Yönetimi',  crumb: ['Genel', 'Kur Yönetimi'] },
  { match: '/',              title: 'Dashboard',      crumb: ['Genel', 'Dashboard'] },
];

function resolveTitle(pathname) {
  const entry = TITLE_MAP.find((e) => pathname.startsWith(e.match));
  return entry || TITLE_MAP[TITLE_MAP.length - 1];
}

/* ---------- Sidebar ---------- */
function AppSider({ themeMode, onToggleTheme, invoiceCount }) {
  const location = useLocation();
  const selectedKey = getSelectedKey(location.pathname);

  const NAV = [
    { key: '/',             label: 'Dashboard',    icon: <AppstoreOutlined />,      count: null },
    { key: '/invoices',     label: 'Faturalar',    icon: <UnorderedListOutlined />, count: invoiceCount },
    { key: '/invoices/new', label: 'Yeni Fatura',  icon: <PlusOutlined />,          count: null },
    { key: '/fx-rates',     label: 'Kur Yönetimi', icon: <SwapOutlined />,          count: null },
  ];

  return (
    <Sider
      width={240}
      collapsedWidth={64}
      collapsed={false}
      trigger={null}
      style={{
        background: 'var(--surface-raised)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 12px 14px' }}>
        {/* Lockup */}
        <div className="tt-lockup">
          <TTMark size={28} color="var(--color-primary-600)" />
          <span style={{ font: '600 16px/1 "Inter Tight", sans-serif', letterSpacing: '-0.022em', color: 'var(--text-primary)' }}>
            tax<span style={{ color: 'var(--color-primary-600)' }}>tracker</span>
          </span>
        </div>

        {/* Section label */}
        <div className="nav-section-label">Genel</div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = selectedKey === item.key;
            return (
              <Link
                key={item.key}
                to={item.key}
                className={'nav-item' + (active ? ' active' : '')}
              >
                <span style={{ fontSize: 16, display: 'inline-flex' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.count != null && (
                  <span className="count">{item.count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <Tooltip title={themeMode === 'dark' ? 'Aydınlık tema' : 'Karanlık tema'}>
            <button className="tt-icon-btn" onClick={onToggleTheme} aria-label="Tema değiştir">
              {themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </Tooltip>
          <span className="build">v1.0.0</span>
        </div>
      </div>
    </Sider>
  );
}

/* ---------- Topbar ---------- */
function AppHeader({ topRight }) {
  const location = useLocation();
  const { title, crumb } = resolveTitle(location.pathname);

  return (
    <Header
      style={{
        height: 64,
        background: 'var(--surface-base)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        lineHeight: 'normal',
      }}
    >
      <div className="topbar-left">
        <div className="crumbs">
          {crumb.map((c, i) => (
            <React.Fragment key={c}>
              {i > 0 && <span className="sep">/</span>}
              <span>{c}</span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="page-title">{title}</h1>
      </div>
      {topRight && (
        <div className="topbar-right">{topRight}</div>
      )}
    </Header>
  );
}

/* ---------- App ---------- */
function App() {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('taxtracker-theme') || 'light';
  });

  const [topRight, setTopRight] = useState(null);
  const [invoiceCount, setInvoiceCount] = useState(null);

  /* Sync data-theme attribute on mount and on change */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    localStorage.setItem('taxtracker-theme', themeMode);
  }, [themeMode]);

  /* Fetch invoice count once for the sidebar badge */
  useEffect(() => {
    if (window.api && window.api.getInvoices) {
      window.api.getInvoices({}).then((data) => {
        if (Array.isArray(data)) setInvoiceCount(data.length);
      }).catch(() => {});
    }
  }, []);

  const antdTheme = useMemo(() => (themeMode === 'dark' ? darkTheme : lightTheme), [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ConfigProvider theme={antdTheme}>
      <Layout style={{ minHeight: '100vh', background: 'var(--surface-base)' }}>
        <AppSider
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          invoiceCount={invoiceCount}
        />
        <Layout style={{ background: 'var(--surface-base)' }}>
          <AppHeader topRight={topRight} />
          <Content>
            <div className="page-wrapper">
              <TopBarContext.Provider value={{ setRight: setTopRight }}>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/"                    element={<Dashboard />} />
                    <Route path="/invoices"            element={<InvoiceList />} />
                    <Route path="/invoices/new"        element={<InvoiceForm />} />
                    <Route path="/invoices/edit/:id"   element={<InvoiceForm />} />
                    <Route path="/fx-rates"            element={<FxRates />} />
                  </Routes>
                </ErrorBoundary>
              </TopBarContext.Provider>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
