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
  Divider,
  Card,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  FilterOutlined,
  DownloadOutlined
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
  const [totals, setTotals] = useState({
    subtotal: 0,
    vatAmount: 0,
    total: 0
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.api) {
      message.error('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await window.api.getInvoices(filters);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from API');
      }
      
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
      calculateTotals(sortedData);
    } catch (error) {
      message.error('Faturalar yüklenirken bir hata oluştu: ' + error.message);
      setInvoices([]);
      setTotals({ subtotal: 0, vatAmount: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (invoiceData) => {
    if (!Array.isArray(invoiceData) || invoiceData.length === 0) {
      setTotals({ subtotal: 0, vatAmount: 0, total: 0 });
      return;
    }
    
    let subtotalSum = 0;
    let vatAmountSum = 0;
    let totalSum = 0;

    invoiceData.forEach((invoice, index) => {
      try {
        // Use TRY equivalent values if available
        if (invoice.try_equivalent && invoice.try_equivalent.total) {
          subtotalSum += Number(invoice.try_equivalent.subtotal) || 0;
          vatAmountSum += Number(invoice.try_equivalent.vat_amount) || 0;
          totalSum += Number(invoice.try_equivalent.total) || 0;
        } else if (invoice.currency === 'TRY') {
          // For TRY invoices without try_equivalent, use direct values
          const subtotal = Number(invoice.subtotal) || 0;
          const vatRate = Number(invoice.vat_rate) || 0;
          const vatAmount = subtotal * (vatRate / 100);
          
          subtotalSum += subtotal;
          vatAmountSum += vatAmount;
          totalSum += Number(invoice.total || 0);
        } else {
          // For foreign currency invoices without try_equivalent, skip
        }
      } catch (error) {
        // silently skip malformed invoice entries
      }
    });

    setTotals({
      subtotal: subtotalSum,
      vatAmount: vatAmountSum,
      total: totalSum
    });
  };

  const handleDelete = async (id) => {
    try {
      await window.api.deleteInvoice(id);
      message.success('Fatura başarıyla silindi.');
      fetchInvoices();
    } catch (error) {
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

  const exportToExcel = async () => {
    if (invoices.length === 0) {
      message.warning('Aktarılacak fatura bulunamadı.');
      return;
    }

    try {
      const fileName = `Faturalar_${dayjs().format('YYYY-MM-DD')}.xlsx`;

      const filePath = await window.api.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });

      if (!filePath) return; // User cancelled

      const exportData = invoices.map((invoice) => {
        const vatAmount = invoice.subtotal * (invoice.vat_rate / 100);
        let trySubtotal = 0, tryVatAmount = 0, tryTotal = 0;

        if (invoice.try_equivalent && invoice.try_equivalent.total) {
          trySubtotal = invoice.try_equivalent.subtotal || 0;
          tryVatAmount = invoice.try_equivalent.vat_amount || 0;
          tryTotal = invoice.try_equivalent.total || 0;
        } else if (invoice.currency === 'TRY') {
          trySubtotal = invoice.subtotal;
          tryVatAmount = vatAmount;
          tryTotal = invoice.total;
        }

        const hasTryEquivalent = invoice.try_equivalent && invoice.try_equivalent.total;

        return {
          'Tarih': dayjs(invoice.date).format('DD/MM/YYYY'),
          'Fatura Tip': invoice.invoice_type || 'Alış',
          'Şirket': invoice.company,
          'Fatura No': invoice.invoice_no,
          'Para Birim': invoice.currency,
          'Ara Toplam': typeof invoice.subtotal === 'number' ? invoice.subtotal.toFixed(2) : invoice.subtotal,
          'KDV Oranı': typeof invoice.vat_rate === 'number' ? invoice.vat_rate.toFixed(2) : invoice.vat_rate,
          'KDV Tutar': typeof vatAmount === 'number' ? vatAmount.toFixed(2) : vatAmount,
          'Genel Toplam': typeof invoice.total === 'number' ? invoice.total.toFixed(2) : invoice.total,
          'Ara Toplam (TL)': hasTryEquivalent || invoice.currency === 'TRY' ? (typeof trySubtotal === 'number' ? trySubtotal.toFixed(2) : trySubtotal) : 'KUR EKSIK',
          'KDV Tutar (TL)': hasTryEquivalent || invoice.currency === 'TRY' ? (typeof tryVatAmount === 'number' ? tryVatAmount.toFixed(2) : tryVatAmount) : 'KUR EKSIK',
          'Genel Toplam (TL)': hasTryEquivalent || invoice.currency === 'TRY' ? (typeof tryTotal === 'number' ? tryTotal.toFixed(2) : tryTotal) : 'KUR EKSIK'
        };
      });

      const totalRow = {
        'Tarih': '',
        'Fatura Tip': '',
        'Şirket': '',
        'Fatura No': '',
        'Para Birim': '',
        'Ara Toplam': '',
        'KDV Oranı': '',
        'KDV Tutar': '',
        'Genel Toplam': '',
        'Ara Toplam (TL)': exportData.reduce((sum, row) => sum + Number(row['Ara Toplam (TL)'] || 0), 0).toFixed(2),
        'KDV Tutar (TL)': exportData.reduce((sum, row) => sum + Number(row['KDV Tutar (TL)'] || 0), 0).toFixed(2),
        'Genel Toplam (TL)': exportData.reduce((sum, row) => sum + Number(row['Genel Toplam (TL)'] || 0), 0).toFixed(2)
      };

      const colWidths = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }
      ];

      await window.api.exportToExcel({
        rows: exportData,
        totalRow,
        colWidths,
        sheetName: 'Faturalar'
      }, filePath);

      message.success(`Faturalar başarıyla aktarıldı. (${exportData.length} satır)`);
    } catch (error) {
      message.error('Excel dosyası oluşturulurken bir hata oluştu: ' + error.message);
    }
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
        const className = text === 'Alış' ? 'tag-alis' : 'tag-satis';
        return <Tag className={className}>{text || 'Alış'}</Tag>;
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
      render: (text, record) => (
        <>
          <div>{typeof text === 'number' ? text.toFixed(2) : '-'} {record.currency}</div>
          <small style={{ color: 'var(--color-text-muted)' }}>
            {record.try_equivalent && typeof record.try_equivalent.subtotal === 'number' ? record.try_equivalent.subtotal.toFixed(2) : '-'} TL
          </small>
        </>
      ),
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
        const vatAmount = (typeof record.subtotal === 'number' && typeof record.vat_rate === 'number') ? record.subtotal * (record.vat_rate / 100) : 0;
        return (
          <>
            <div>{typeof vatAmount === 'number' ? vatAmount.toFixed(2) : '-'} {record.currency}</div>
            <small style={{ color: 'var(--color-text-muted)' }}>
              {record.try_equivalent && typeof record.try_equivalent.vat_amount === 'number' ? record.try_equivalent.vat_amount.toFixed(2) : '-'} TL
            </small>
          </>
        );
      },
      sorter: (a, b) => (a.subtotal * a.vat_rate / 100) - (b.subtotal * b.vat_rate / 100)
    },
    {
      title: 'Genel Toplam',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => (
        <>
          <div>{typeof text === 'number' ? text.toFixed(2) : '-'} {record.currency}</div>
          <small style={{ color: 'var(--color-text-muted)' }}>
            {record.try_equivalent && typeof record.try_equivalent.total === 'number' ? record.try_equivalent.total.toFixed(2) : '-'} TL
          </small>
        </>
      ),
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
          <Space>
            <Button 
              icon={<DownloadOutlined />}
              onClick={exportToExcel}
            >
              Excel'e Aktar
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/invoices/new')}
            >
              Yeni Fatura
            </Button>
          </Space>
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

      <style>{`
        .invoice-type-separator td {
          border-top: 3px solid var(--color-border);
        }
        .ant-table-row:hover .invoice-type-separator {
          border-top: 3px solid var(--color-border);
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
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>TOPLAM (TL)</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong>{typeof totals.subtotal === 'number' ? totals.subtotal.toFixed(2) : '0.00'} TL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}></Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <strong>{typeof totals.vatAmount === 'number' ? totals.vatAmount.toFixed(2) : '0.00'} TL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  <strong>{typeof totals.total === 'number' ? totals.total.toFixed(2) : '0.00'} TL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Spin>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card className="dashboard-card">
            <Statistic 
              title="Toplam Ara Toplam (TL)" 
              value={typeof totals.subtotal === 'number' ? totals.subtotal : 0} 
              precision={2}
              suffix="TL" 
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="dashboard-card">
            <Statistic 
              title="Toplam KDV (TL)" 
              value={typeof totals.vatAmount === 'number' ? totals.vatAmount : 0} 
              precision={2} 
              suffix="TL"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="dashboard-card">
            <Statistic 
              title="Toplam Genel Toplam (TL)" 
              value={typeof totals.total === 'number' ? totals.total : 0} 
              precision={2} 
              suffix="TL"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InvoiceList; 