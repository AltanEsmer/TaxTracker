import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { 
  HomeOutlined, 
  FileAddOutlined, 
  DollarOutlined, 
  BarChartOutlined 
} from '@ant-design/icons';

import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import FxRates from './pages/FxRates';

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header>
        <div className="logo">Tax Tracker</div>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          items={[
            {
              key: '1',
              icon: <HomeOutlined />,
              label: <Link to="/">Dashboard</Link>,
            },
            {
              key: '2',
              icon: <FileAddOutlined />,
              label: <Link to="/invoices">Faturalar</Link>,
            },
            {
              key: '3',
              icon: <FileAddOutlined />,
              label: <Link to="/invoices/new">Yeni Fatura</Link>,
            },
            {
              key: '4',
              icon: <DollarOutlined />,
              label: <Link to="/fx-rates">Kur Yönetimi</Link>,
            },
          ]}
        />
      </Header>
      <Content className="content-container">
        <div className="site-layout-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/new" element={<InvoiceForm />} />
            <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
            <Route path="/fx-rates" element={<FxRates />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Fatura Kayıt ve KDV Takip Uygulaması ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

export default App; 