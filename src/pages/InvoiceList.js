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
import * as XLSX from 'xlsx';

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
      calculateTotals(sortedData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Faturalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (invoiceData) => {
    let subtotalSum = 0;
    let vatAmountSum = 0;
    let totalSum = 0;

    invoiceData.forEach(invoice => {
      // Use TRY equivalent values if available
      if (invoice.try_equivalent && invoice.try_equivalent.total) {
        subtotalSum += invoice.try_equivalent.subtotal || 0;
        vatAmountSum += invoice.try_equivalent.vat_amount || 0;
        totalSum += invoice.try_equivalent.total || 0;
        
        console.log('Using TRY equivalent for invoice:', invoice.invoice_no, 
                    'TRY Total:', invoice.try_equivalent.total);
      } else {
        // Fallback to calculating based on currency conversion
        const vatAmount = invoice.subtotal * (invoice.vat_rate / 100);
        
        // Apply conversion if needed
        let conversionRate = 1; // Default for TRY
        if (invoice.currency === 'USD') {
          // Use a fallback rate if not available
          conversionRate = 30; // Fallback rate
        } else if (invoice.currency === 'EUR') {
          // Use a fallback rate if not available
          conversionRate = 32; // Fallback rate
        }
        
        subtotalSum += invoice.subtotal * conversionRate;
        vatAmountSum += vatAmount * conversionRate;
        totalSum += invoice.total * conversionRate;
        
        console.log('Using fallback conversion for invoice:', invoice.invoice_no, 
                    'Currency:', invoice.currency, 'Rate:', conversionRate, 
                    'Original Total:', invoice.total, 'TRY Total:', invoice.total * conversionRate);
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

  const exportToExcel = () => {
    // Create data for export
    const exportData = invoices.map(invoice => {
      const vatAmount = invoice.subtotal * (invoice.vat_rate / 100);
      
      // Get TRY equivalents
      const trySubtotal = invoice.try_equivalent ? invoice.try_equivalent.subtotal : 0;
      const tryVatAmount = invoice.try_equivalent ? invoice.try_equivalent.vat_amount : 0;
      const tryTotal = invoice.try_equivalent ? invoice.try_equivalent.total : 0;
      
      return {
        'Tarih': dayjs(invoice.date).format('DD/MM/YYYY'),
        'Fatura Tipi': invoice.invoice_type || 'Alış',
        'Şirket': invoice.company,
        'Fatura No': invoice.invoice_no,
        'Para Birimi': invoice.currency,
        'Ara Toplam': invoice.subtotal.toFixed(2),
        'KDV Oranı (%)': invoice.vat_rate,
        'KDV Tutarı': vatAmount.toFixed(2),
        'Genel Toplam': invoice.total.toFixed(2),
        'Ara Toplam (TL)': trySubtotal.toFixed(2),
        'KDV Tutarı (TL)': tryVatAmount.toFixed(2),
        'Genel Toplam (TL)': tryTotal.toFixed(2)
      };
    });
    
    // Group invoices by type
    const alisFaturalari = invoices.filter(inv => (inv.invoice_type || 'Alış') === 'Alış');
    const satisFaturalari = invoices.filter(inv => inv.invoice_type === 'Satış');
    
    // Calculate totals by type
    const alisTotals = calculateTotals(alisFaturalari);
    const satisTotals = calculateTotals(satisFaturalari);
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const wscols = [
      { wch: 12 },  // Tarih
      { wch: 10 },  // Fatura Tipi
      { wch: 30 },  // Şirket
      { wch: 15 },  // Fatura No
      { wch: 10 },  // Para Birimi
      { wch: 12 },  // Ara Toplam
      { wch: 12 },  // KDV Oranı
      { wch: 12 },  // KDV Tutarı
      { wch: 14 },  // Genel Toplam
      { wch: 15 },  // Ara Toplam (TL)
      { wch: 15 },  // KDV Tutarı (TL)
      { wch: 16 }   // Genel Toplam (TL)
    ];
    ws['!cols'] = wscols;
    
    // Add a header style
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    
    // Add a total row style
    const totalStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E2EFDA" } }
    };
    
    // Apply styles to header row
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[headerCell]) continue;
      if (!ws[headerCell].s) ws[headerCell].s = {};
      ws[headerCell].s = headerStyle;
    }
    
    // Add a total row with style
    const totalRowIndex = exportData.length;
    const totalRow = {
      'Tarih': 'TOPLAM',
      'Fatura Tipi': '',
      'Şirket': '',
      'Fatura No': '',
      'Para Birimi': '',
      'Ara Toplam': '',
      'KDV Oranı (%)': '',
      'KDV Tutarı': '',
      'Genel Toplam': '',
      'Ara Toplam (TL)': totals.subtotal.toFixed(2),
      'KDV Tutarı (TL)': totals.vatAmount.toFixed(2),
      'Genel Toplam (TL)': totals.total.toFixed(2)
    };
    
    // Add the total row
    XLSX.utils.sheet_add_json(ws, [totalRow], { skipHeader: true, origin: totalRowIndex });
    
    // Apply total row style
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const totalCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: C });
      if (!ws[totalCell]) continue;
      if (!ws[totalCell].s) ws[totalCell].s = {};
      ws[totalCell].s = totalStyle;
    }
    
    // Create a summary sheet
    const summaryData = [
      { 'Fatura Tipi': 'Alış Faturaları', 'Fatura Sayısı': alisFaturalari.length, 'Toplam Tutar (TL)': alisTotals.total.toFixed(2), 'Toplam KDV (TL)': alisTotals.vatAmount.toFixed(2) },
      { 'Fatura Tipi': 'Satış Faturaları', 'Fatura Sayısı': satisFaturalari.length, 'Toplam Tutar (TL)': satisTotals.total.toFixed(2), 'Toplam KDV (TL)': satisTotals.vatAmount.toFixed(2) },
      { 'Fatura Tipi': 'GENEL TOPLAM', 'Fatura Sayısı': invoices.length, 'Toplam Tutar (TL)': totals.total.toFixed(2), 'Toplam KDV (TL)': totals.vatAmount.toFixed(2) }
    ];
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    
    // Set summary column widths
    const wsSummaryCols = [
      { wch: 20 },  // Fatura Tipi
      { wch: 15 },  // Fatura Sayısı
      { wch: 20 },  // Toplam Tutar
      { wch: 20 }   // Toplam KDV
    ];
    wsSummary['!cols'] = wsSummaryCols;
    
    // Apply styles to summary header
    const summaryHeaderRange = XLSX.utils.decode_range(wsSummary['!ref']);
    for (let C = summaryHeaderRange.s.c; C <= summaryHeaderRange.e.c; ++C) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!wsSummary[headerCell]) continue;
      if (!wsSummary[headerCell].s) wsSummary[headerCell].s = {};
      wsSummary[headerCell].s = headerStyle;
    }
    
    // Apply style to the total row in summary
    for (let C = summaryHeaderRange.s.c; C <= summaryHeaderRange.e.c; ++C) {
      const totalCell = XLSX.utils.encode_cell({ r: 2, c: C });
      if (!wsSummary[totalCell]) continue;
      if (!wsSummary[totalCell].s) wsSummary[totalCell].s = {};
      wsSummary[totalCell].s = totalStyle;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet');
    XLSX.utils.book_append_sheet(wb, ws, 'Faturalar');
    
    // Generate file name with date
    const fileName = `Faturalar_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    
    // Export to file
    XLSX.writeFile(wb, fileName);
    
    message.success(`Faturalar başarıyla ${fileName} dosyasına aktarıldı.`);
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
      render: (text, record) => (
        <>
          <div>{text.toFixed(2)} {record.currency}</div>
          <small style={{ color: '#888' }}>
            {record.try_equivalent ? record.try_equivalent.subtotal.toFixed(2) : '-'} TL
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
        const vatAmount = record.subtotal * (record.vat_rate / 100);
        return (
          <>
            <div>{vatAmount.toFixed(2)} {record.currency}</div>
            <small style={{ color: '#888' }}>
              {record.try_equivalent ? record.try_equivalent.vat_amount.toFixed(2) : '-'} TL
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
          <div>{text.toFixed(2)} {record.currency}</div>
          <small style={{ color: '#888' }}>
            {record.try_equivalent ? record.try_equivalent.total.toFixed(2) : '-'} TL
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
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>TOPLAM (TL)</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong>{totals.subtotal.toFixed(2)} TL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}></Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <strong>{totals.vatAmount.toFixed(2)} TL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  <strong>{totals.total.toFixed(2)} TL</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Spin>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Toplam Ara Toplam (TL)" 
              value={totals.subtotal} 
              precision={2}
              suffix="TL" 
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Toplam KDV (TL)" 
              value={totals.vatAmount} 
              precision={2} 
              suffix="TL"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Toplam Genel Toplam (TL)" 
              value={totals.total} 
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