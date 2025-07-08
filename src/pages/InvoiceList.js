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
      console.log('Fetching invoices with filters:', filters);
      const data = await window.api.getInvoices(filters);
      
      console.log('Raw invoice data received:', data.length, 'records');
      
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
      
      console.log('Sorted invoice data:', sortedData.length, 'records');
      setInvoices(sortedData);
      calculateTotals(sortedData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
          
          console.log(`Invoice ${index + 1}: Using TRY equivalent for invoice:`, invoice.invoice_no, 
                      'TRY Total:', invoice.try_equivalent.total);
        } else {
          // Fallback to calculating based on currency conversion
          const subtotal = Number(invoice.subtotal) || 0;
          const vatRate = Number(invoice.vat_rate) || 0;
          const vatAmount = subtotal * (vatRate / 100);
          
          // Apply conversion if needed
          let conversionRate = 1; // Default for TRY
          if (invoice.currency === 'USD') {
            // Use a fallback rate if not available
            conversionRate = 30; // Fallback rate
          } else if (invoice.currency === 'EUR') {
            // Use a fallback rate if not available
            conversionRate = 32; // Fallback rate
          }
          
          subtotalSum += subtotal * conversionRate;
          vatAmountSum += vatAmount * conversionRate;
          totalSum += Number(invoice.total || 0) * conversionRate;
          
          console.log(`Invoice ${index + 1}: Using fallback conversion for invoice:`, invoice.invoice_no, 
                      'Currency:', invoice.currency, 'Rate:', conversionRate, 
                      'Original Total:', invoice.total, 'TRY Total:', Number(invoice.total || 0) * conversionRate);
        }
      } catch (error) {
        console.error(`Error calculating totals for invoice ${index + 1}:`, error);
      }
    });

    console.log('Final totals calculated:', { subtotalSum, vatAmountSum, totalSum });

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
    if (invoices.length === 0) {
      message.warning('Aktarılacak fatura bulunamadı.');
      return;
    }

    try {
      console.log('Exporting invoices:', invoices.length, 'records');
      
      // Prepare data for export (columns as in the image)
      const exportData = invoices.map((invoice, index) => {
        const vatAmount = invoice.subtotal * (invoice.vat_rate / 100);
        let trySubtotal = 0, tryVatAmount = 0, tryTotal = 0;
        
        if (invoice.try_equivalent && invoice.try_equivalent.total) {
          trySubtotal = invoice.try_equivalent.subtotal || 0;
          tryVatAmount = invoice.try_equivalent.vat_amount || 0;
          tryTotal = invoice.try_equivalent.total || 0;
        } else {
          let conversionRate = 1;
          if (invoice.currency === 'USD') conversionRate = 30;
          else if (invoice.currency === 'EUR') conversionRate = 32;
          trySubtotal = invoice.subtotal * conversionRate;
          tryVatAmount = vatAmount * conversionRate;
          tryTotal = invoice.total * conversionRate;
        }
        
        const row = {
          'Tarih': dayjs(invoice.date).format('DD/MM/YYYY'),
          'Fatura Tip': invoice.invoice_type || 'Alış',
          'Şirket': invoice.company,
          'Fatura No': invoice.invoice_no,
          'Para Birim': invoice.currency,
          'Ara Toplam': invoice.subtotal,
          'KDV Oranı': invoice.vat_rate,
          'KDV Tutar': vatAmount,
          'Genel Top': invoice.total,
          'Ara Toplam (TL)': trySubtotal,
          'KDV Tutar (TL)': tryVatAmount,
          'Genel Toplam (TL)': tryTotal
        };
        
        console.log(`Row ${index + 1}:`, row);
        return row;
      });

      console.log('Export data prepared:', exportData.length, 'rows');

      // Calculate totals for TL columns
      const totalRow = {
        'Tarih': '',
        'Fatura Tip': '',
        'Şirket': '',
        'Fatura No': '',
        'Para Birim': '',
        'Ara Toplam': '',
        'KDV Oranı': '',
        'KDV Tutar': '',
        'Genel Top': '',
        'Ara Toplam (TL)': exportData.reduce((sum, row) => sum + Number(row['Ara Toplam (TL)'] || 0), 0),
        'KDV Tutar (TL)': exportData.reduce((sum, row) => sum + Number(row['KDV Tutar (TL)'] || 0), 0),
        'Genel Toplam (TL)': exportData.reduce((sum, row) => sum + Number(row['Genel Toplam (TL)'] || 0), 0)
      };

      console.log('Total row:', totalRow);

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Add total row
      XLSX.utils.sheet_add_json(ws, [totalRow], { skipHeader: true, origin: exportData.length + 1 });

      // Set column widths for readability
      ws['!cols'] = [
        { wch: 12 }, // Tarih
        { wch: 10 }, // Fatura Tip
        { wch: 20 }, // Şirket
        { wch: 15 }, // Fatura No
        { wch: 10 }, // Para Birim
        { wch: 12 }, // Ara Toplam
        { wch: 10 }, // KDV Oranı
        { wch: 12 }, // KDV Tutar
        { wch: 12 }, // Genel Top
        { wch: 16 }, // Ara Toplam (TL)
        { wch: 16 }, // KDV Tutar (TL)
        { wch: 16 }  // Genel Toplam (TL)
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Faturalar');

      // Generate file name with date
      const fileName = `Faturalar_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('Excel file created successfully:', fileName);
      message.success(`Faturalar başarıyla ${fileName} dosyasına aktarıldı. (${exportData.length} satır)`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
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
          <div>{typeof text === 'number' ? text.toFixed(2) : '-'} {record.currency}</div>
          <small style={{ color: '#888' }}>
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
            <small style={{ color: '#888' }}>
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
          <small style={{ color: '#888' }}>
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
          <Card>
            <Statistic 
              title="Toplam Ara Toplam (TL)" 
              value={typeof totals.subtotal === 'number' ? totals.subtotal : 0} 
              precision={2}
              suffix="TL" 
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Toplam KDV (TL)" 
              value={typeof totals.vatAmount === 'number' ? totals.vatAmount : 0} 
              precision={2} 
              suffix="TL"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
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