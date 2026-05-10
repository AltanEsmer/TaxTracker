import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, Button } from 'antd';
import { HomeOutlined, FileAddOutlined, DollarOutlined, BulbOutlined, BulbFilled, SettingOutlined } from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import FxRates from './pages/FxRates';
import KdvSettings from './pages/KdvSettings';
import { ErrorBoundary } from './components/ErrorBoundary';

const { Content, Sider } = Layout;

const getSelectedKey = (pathname) => {
  if (pathname === '/') return '1';
  if (pathname === '/invoices') return '2';
  if (pathname === '/invoices/new') return '3';
  if (pathname.startsWith('/invoices/edit')) return '2';
  if (pathname === '/fx-rates') return '4';
  if (pathname === '/kdv-rates') return '5';
  return '1';
};

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

function App() {
  const location = useLocation();
  const selectedKey = getSelectedKey(location.pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('taxtracker-theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(saved);
  }, []);

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('taxtracker-theme', theme);
    setThemeMode(theme);
  };

  const toggleTheme = () => {
    applyTheme(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <ConfigProvider theme={antTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
          className="sidebar"
          width={220}
          collapsedWidth={64}
        >
          <div className="logo" style={{ padding: '16px', display: 'flex', justifyContent: 'center', height: '64px', alignItems: 'center' }}>
            {collapsed ? (
              <img src="/logo_tax-removebg-preview.png" alt="Logo" style={{ width: '32px' }} />
            ) : (
              <img src="/logo_tax-removebg-preview.png" alt="TaxTracker Logo" style={{ height: '40px' }} />
            )}
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={[
              { key: '1', icon: <HomeOutlined />, label: <Link to="/">Dashboard</Link> },
              { key: '2', icon: <FileAddOutlined />, label: <Link to="/invoices">Faturalar</Link> },
              { key: '3', icon: <FileAddOutlined />, label: <Link to="/invoices/new">Yeni Fatura</Link> },
              { key: '4', icon: <DollarOutlined />, label: <Link to="/fx-rates">Kur Yönetimi</Link> },
              { key: '5', icon: <SettingOutlined />, label: <Link to="/kdv-rates">KDV Oranları</Link> },
            ]}
          />
          <div style={{ position: 'absolute', bottom: '48px', width: '100%', textAlign: 'center', padding: '16px 0' }}>
            <Button 
              type="text" 
              icon={themeMode === 'light' ? <BulbOutlined /> : <BulbFilled />} 
              onClick={toggleTheme}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {!collapsed && (themeMode === 'light' ? ' Dark Mode' : ' Light Mode')}
            </Button>
          </div>
        </Sider>
        <Layout>
          <Content>
            <div className="page-wrapper">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/invoices" element={<InvoiceList />} />
                  <Route path="/invoices/new" element={<InvoiceForm />} />
                  <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                  <Route path="/fx-rates" element={<FxRates />} />
                  <Route path="/kdv-rates" element={<KdvSettings />} />
                </Routes>
              </ErrorBoundary>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;