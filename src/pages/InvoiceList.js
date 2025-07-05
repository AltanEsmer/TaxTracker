import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Input, 
  DatePicker, 
  Select, 
  Popconfirm, 
  message, 
  Spin,
  Tag,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  FilterOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const InvoiceList = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    company: '',
    currency: '',
    invoice_type: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await window.api.getInvoices(filters);
      
      // Sort by invoice type and date
      const sortedData = [...data].sort((a, b) => {
        // First sort by invoice type
        const typeA = a.invoice_type || 'Alış';
        const typeB = b.invoice_type || 'Alış';
        const typeCompare = typeA.localeCompare(typeB);
        
        if (typeCompare !== 0) return typeCompare;
        
        // Then sort by date (descending)
        return new Date(b.date) - new Date(a.date);
      });
      
      setInvoices(sortedData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Faturalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await window.api.deleteInvoice(id);
      message.success('Fatura başarıyla silindi.');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Fatura silinirken bir hata oluştu.');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0]?.format('YYYY-MM-DD') || null,
        endDate: dates[1]?.format('YYYY-MM-DD') || null
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: null,
        endDate: null
      }));
    }
  };

  const handleSearch = () => {
    fetchInvoices();
  };

  const handleReset = () => {
    setFilters({
      startDate: null,
      endDate: null,
      company: '',
      currency: '',
      invoice_type: ''
    });
    fetchInvoices();
  };

  // Add row class name based on invoice type
  const getRowClassName = (record, index) => {
    if (index > 0) {
      const prevInvoice = invoices[index - 1];
      const currentType = record.invoice_type || 'Alış';
      const prevType = prevInvoice.invoice_type || 'Alış';
      
      if (currentType !== prevType) {
        return 'invoice-type-separator';
      }
    }
    return '';
  };

  const columns = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      render: text => dayjs(text).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: 'Fatura Tipi',
      dataIndex: 'invoice_type',
      key: 'invoice_type',
      render: text => {
        const color = text === 'Alış' ? 'blue' : 'green';
        return <Tag color={color}>{text || 'Alış'}</Tag>;
      },
      sorter: (a, b) => (a.invoice_type || 'Alış').localeCompare(b.invoice_type || 'Alış')
    },
    {
      title: 'Şirket',
      dataIndex: 'company',
      key: 'company',
      sorter: (a, b) => a.company.localeCompare(b.company)
    },
    {
      title: 'Fatura No',
      dataIndex: 'invoice_no',
      key: 'invoice_no',
    },
    {
      title: 'Ara Toplam',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (text, record) => `${text.toFixed(2)} ${record.currency}`,
      sorter: (a, b) => a.subtotal - b.subtotal
    },
    {
      title: 'KDV Oranı',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      render: text => `%${text}`,
      sorter: (a, b) => a.vat_rate - b.vat_rate
    },
    {
      title: 'KDV Tutarı',
      key: 'vat_amount',
      render: (_, record) => {
        const vatAmount = record.subtotal * (record.vat_rate / 100);
        return `${vatAmount.toFixed(2)} ${record.currency}`;
      },
      sorter: (a, b) => (a.subtotal * a.vat_rate / 100) - (b.subtotal * b.vat_rate / 100)
    },
    {
      title: 'Genel Toplam',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => `${text.toFixed(2)} ${record.currency}`,
      sorter: (a, b) => a.total - b.total
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => navigate(`/invoices/edit/${record.id}`)}
          />
          <Popconfirm
            title="Bu faturayı silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDelete(record.id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button 
              type="primary" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" className="page-header">
        <Col span={16}>
          <Title level={2}>Faturalar</Title>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/invoices/new')}
          >
            Yeni Fatura
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <RangePicker 
            style={{ width: '100%' }}
            onChange={handleDateRangeChange}
            format="DD/MM/YYYY"
            value={[
              filters.startDate ? dayjs(filters.startDate) : null,
              filters.endDate ? dayjs(filters.endDate) : null
            ]}
          />
        </Col>
        <Col span={5}>
          <Input
            placeholder="Şirket Ara"
            value={filters.company}
            onChange={e => handleFilterChange('company', e.target.value)}
            prefix={<SearchOutlined />}
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder="Para Birimi"
            style={{ width: '100%' }}
            value={filters.currency || undefined}
            onChange={value => handleFilterChange('currency', value)}
            allowClear
          >
            <Option value="TRY">TRY</Option>
            <Option value="USD">USD</Option>
            <Option value="EUR">EUR</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="Fatura Tipi"
            style={{ width: '100%' }}
            value={filters.invoice_type || undefined}
            onChange={value => handleFilterChange('invoice_type', value)}
            allowClear
          >
            <Option value="Alış">Alış</Option>
            <Option value="Satış">Satış</Option>
          </Select>
        </Col>
        <Col span={6}>
          <Space>
            <Button 
              type="primary" 
              icon={<FilterOutlined />} 
              onClick={handleSearch}
            >
              Filtrele
            </Button>
            <Button onClick={handleReset}>Sıfırla</Button>
          </Space>
        </Col>
      </Row>

      <style jsx global>{`
        .invoice-type-separator td {
          border-top: 3px solid #f0f0f0;
        }
        .ant-table-row:hover .invoice-type-separator {
          border-top: 3px solid #f0f0f0;
        }
      `}</style>

      <Spin spinning={loading}>
        <Table 
          columns={columns} 
          dataSource={invoices} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
          rowClassName={getRowClassName}
        />
      </Spin>
    </div>
  );
};

export default InvoiceList; 