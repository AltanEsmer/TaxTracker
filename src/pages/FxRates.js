import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Form, 
  InputNumber, 
  Select, 
  Typography, 
  Row, 
  Col, 
  Card, 
  message, 
  Spin,
  Popconfirm,
  Space
} from 'antd';
import { 
  SaveOutlined, 
  EditOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const FxRates = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [fxRates, setFxRates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [usdRates, setUsdRates] = useState({ rate1: 0, rate2: 0, rate3: 0 });
  const [eurRates, setEurRates] = useState({ rate1: 0, rate2: 0, rate3: 0 });
  const [usdAverage, setUsdAverage] = useState(0);
  const [eurAverage, setEurAverage] = useState(0);
  
  useEffect(() => {
    if (!window.api) {
      message.error('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
    // Generate years (2025 to 2030)
    const yearOptions = [];
    for (let year = 2025; year <= 2030; year++) {
      yearOptions.push(year);
    }
    setYears(yearOptions);
    
    // Generate months
    const monthOptions = [];
    for (let i = 1; i <= 12; i++) {
      monthOptions.push(i);
    }
    setMonths(monthOptions);
    
    fetchFxRates();
  }, []);

  const fetchFxRates = async () => {
    try {
      setLoading(true);
      const data = await window.api.getFxRates();
      setFxRates(data);
    } catch (error) {
      console.error('Error fetching FX rates:', error);
      message.error('Kur bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const calculateUsdAverage = (rate1, rate2, rate3) => {
    const validRates = [rate1, rate2, rate3].filter(r => r && r > 0);
    if (validRates.length === 0) return 0;
    const avg = validRates.reduce((sum, r) => sum + r, 0) / validRates.length;
    setUsdAverage(avg);
    form.setFieldsValue({ usd_to_try: parseFloat(avg.toFixed(4)) });
    return avg;
  };

  const calculateEurAverage = (rate1, rate2, rate3) => {
    const validRates = [rate1, rate2, rate3].filter(r => r && r > 0);
    if (validRates.length === 0) return 0;
    const avg = validRates.reduce((sum, r) => sum + r, 0) / validRates.length;
    setEurAverage(avg);
    form.setFieldsValue({ eur_to_try: parseFloat(avg.toFixed(4)) });
    return avg;
  };

  const handleUsdRateChange = (field, value) => {
    const newRates = { ...usdRates, [field]: value || 0 };
    setUsdRates(newRates);
    calculateUsdAverage(newRates.rate1, newRates.rate2, newRates.rate3);
  };

  const handleEurRateChange = (field, value) => {
    const newRates = { ...eurRates, [field]: value || 0 };
    setEurRates(newRates);
    calculateEurAverage(newRates.rate1, newRates.rate2, newRates.rate3);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      if (editingId) {
        await window.api.updateFxRate(editingId, values);
        message.success('Kur bilgisi başarıyla güncellendi.');
      } else {
        // Check if the month/year combination already exists
        const exists = fxRates.some(
          rate => rate.month === values.month && rate.year === values.year
        );
        
        if (exists) {
          message.error('Bu ay için kur bilgisi zaten mevcut.');
          setLoading(false);
          return;
        }
        
        await window.api.addFxRate(values);
        message.success('Kur bilgisi başarıyla eklendi.');
      }
      
      // Reset form and state
      form.resetFields();
      setEditingId(null);
      setUsdRates({ rate1: 0, rate2: 0, rate3: 0 });
      setEurRates({ rate1: 0, rate2: 0, rate3: 0 });
      setUsdAverage(0);
      setEurAverage(0);
      
      // Refresh data
      fetchFxRates();
    } catch (error) {
      console.error('Error saving FX rate:', error);
      message.error('Kur bilgisi kaydedilirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    // Reset average calculation fields when editing
    setUsdRates({ rate1: 0, rate2: 0, rate3: 0 });
    setEurRates({ rate1: 0, rate2: 0, rate3: 0 });
    setUsdAverage(record.usd_to_try || 0);
    setEurAverage(record.eur_to_try || 0);
  };

  const handleCancel = () => {
    setEditingId(null);
    form.resetFields();
    setUsdRates({ rate1: 0, rate2: 0, rate3: 0 });
    setEurRates({ rate1: 0, rate2: 0, rate3: 0 });
    setUsdAverage(0);
    setEurAverage(0);
  };

  const handleDelete = async (record) => {
    try {
      const result = await window.api.deleteFxRate(record.id);
      
      if (result.hasInvoices) {
        message.warning(`Kur bilgisi silindi. Bu aya ait ${result.invoiceCount} fatura bulunmaktadır.`);
      } else {
        message.success('Kur bilgisi başarıyla silindi.');
      }
      
      fetchFxRates();
    } catch (error) {
      console.error('Error deleting FX rate:', error);
      message.error('Kur bilgisi silinirken bir hata oluştu.');
    }
  };

  const getMonthName = (monthNumber) => {
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return monthNames[monthNumber - 1];
  };

  const columns = [
    {
      title: 'Yıl',
      dataIndex: 'year',
      key: 'year',
      sorter: (a, b) => a.year - b.year
    },
    {
      title: 'Ay',
      dataIndex: 'month',
      key: 'month',
      render: month => getMonthName(month),
      sorter: (a, b) => a.month - b.month
    },
    {
      title: 'USD/TRY',
      dataIndex: 'usd_to_try',
      key: 'usd_to_try',
      render: value => (typeof value === 'number' ? value.toFixed(4) : '-')
    },
    {
      title: 'EUR/TRY',
      dataIndex: 'eur_to_try',
      key: 'eur_to_try',
      render: value => (typeof value === 'number' ? value.toFixed(4) : '-')
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Bu kur bilgisini silmek istediğinizden emin misiniz?"
            description={`${getMonthName(record.month)} ${record.year} için kur bilgisi silinecek.`}
            onConfirm={() => handleDelete(record)}
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
        <Col span={24}>
          <Title level={2}>Kur Yönetimi</Title>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title={editingId ? 'Kur Bilgisi Düzenle' : 'Yeni Kur Bilgisi Ekle'} style={{ marginBottom: 24 }}>
            <Form
              form={form}
              layout="horizontal"
              onFinish={handleSubmit}
              initialValues={{
                year: (() => {
                  const currentYear = new Date().getFullYear();
                  return currentYear >= 2025 && currentYear <= 2030 ? currentYear : 2025;
                })(),
                month: new Date().getMonth() + 1,
                usd_to_try: 0,
                eur_to_try: 0
              }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item
                    name="year"
                    label="Yıl"
                    rules={[{ required: true, message: 'Lütfen yıl seçin' }]}
                  >
                    <Select disabled={editingId}>
                      {years.map(year => (
                        <Option key={year} value={year}>{year}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="month"
                    label="Ay"
                    rules={[{ required: true, message: 'Lütfen ay seçin' }]}
                  >
                    <Select disabled={editingId}>
                      {months.map(month => (
                        <Option key={month} value={month}>{getMonthName(month)}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Title level={5}>USD/TRY Kur Hesaplama</Title>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Form.Item label="Kur 1">
                        <InputNumber 
                          style={{ width: '100%' }}
                          min={0}
                          step={0.0001}
                          precision={4}
                          value={usdRates.rate1}
                          onChange={(value) => handleUsdRateChange('rate1', value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Kur 2">
                        <InputNumber 
                          style={{ width: '100%' }}
                          min={0}
                          step={0.0001}
                          precision={4}
                          value={usdRates.rate2}
                          onChange={(value) => handleUsdRateChange('rate2', value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Kur 3">
                        <InputNumber 
                          style={{ width: '100%' }}
                          min={0}
                          step={0.0001}
                          precision={4}
                          value={usdRates.rate3}
                          onChange={(value) => handleUsdRateChange('rate3', value)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="usd_to_try"
                    label="Ortalama USD/TRY"
                    rules={[{ required: true, message: 'Lütfen USD/TRY kurunu girin' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      min={0}
                      step={0.0001}
                      precision={4}
                      readOnly
                      value={usdAverage}
                    />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Title level={5}>EUR/TRY Kur Hesaplama</Title>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Form.Item label="Kur 1">
                        <InputNumber 
                          style={{ width: '100%' }}
                          min={0}
                          step={0.0001}
                          precision={4}
                          value={eurRates.rate1}
                          onChange={(value) => handleEurRateChange('rate1', value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Kur 2">
                        <InputNumber 
                          style={{ width: '100%' }}
                          min={0}
                          step={0.0001}
                          precision={4}
                          value={eurRates.rate2}
                          onChange={(value) => handleEurRateChange('rate2', value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Kur 3">
                        <InputNumber 
                          style={{ width: '100%' }}
                          min={0}
                          step={0.0001}
                          precision={4}
                          value={eurRates.rate3}
                          onChange={(value) => handleEurRateChange('rate3', value)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="eur_to_try"
                    label="Ortalama EUR/TRY"
                    rules={[{ required: true, message: 'Lütfen EUR/TRY kurunu girin' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      min={0}
                      step={0.0001}
                      precision={4}
                      readOnly
                      value={eurAverage}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={24} style={{ textAlign: 'right' }}>
                  <Space>
                    {editingId && (
                      <Button onClick={handleCancel}>
                        İptal
                      </Button>
                    )}
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      icon={editingId ? <SaveOutlined /> : <PlusOutlined />}
                      loading={loading}
                    >
                      {editingId ? 'Güncelle' : 'Ekle'}
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="Kur Listesi">
            <Spin spinning={loading}>
              <Table 
                columns={columns} 
                dataSource={fxRates} 
                rowKey="id" 
                pagination={{ pageSize: 12 }}
              />
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FxRates; 