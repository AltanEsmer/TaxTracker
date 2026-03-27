import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, FileAddOutlined, DollarOutlined } from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import FxRates from './pages/FxRates';
import { ErrorBoundary } from './components/ErrorBoundary';

const { Header, Content, Footer } = Layout;

const getSelectedKey = (pathname) => {
  if (pathname === '/') return '1';
  if (pathname === '/invoices') return '2';
  if (pathname === '/invoices/new') return '3';
  if (pathname.startsWith('/invoices/edit')) return '2';
  if (pathname === '/fx-rates') return '4';
  return '1';
};

function App() {
  const location = useLocation();
  const selectedKey = getSelectedKey(location.pathname);

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header>
        <div className="logo">
          <img src="/logo_tax-removebg-preview.png" alt="TaxTracker Logo" className="logo-img" />
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={[
            { key: '1', icon: <HomeOutlined />, label: <Link to="/">Dashboard</Link> },
            { key: '2', icon: <FileAddOutlined />, label: <Link to="/invoices">Faturalar</Link> },
            { key: '3', icon: <FileAddOutlined />, label: <Link to="/invoices/new">Yeni Fatura</Link> },
            { key: '4', icon: <DollarOutlined />, label: <Link to="/fx-rates">Kur Yönetimi</Link> },
          ]}
        />
      </Header>
      <Content className="content-container">
        <div className="site-layout-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
              <Route path="/fx-rates" element={<FxRates />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Fatura Kayıt ve KDV Takip Uygulaması ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

export default App;