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
  PlusOutlined
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
  
  useEffect(() => {
    if (!window.api) {
      message.error('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
    // Generate years (current year and 5 years back)
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let i = 0; i < 6; i++) {
      yearOptions.push(currentYear - i);
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
  };

  const handleCancel = () => {
    setEditingId(null);
    form.resetFields();
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
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          size="small"
          onClick={() => handleEdit(record)}
        />
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
                year: new Date().getFullYear(),
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
                    <Select>
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
                    <Select>
                      {months.map(month => (
                        <Option key={month} value={month}>{getMonthName(month)}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="usd_to_try"
                    label="USD/TRY"
                    rules={[{ required: true, message: 'Lütfen USD/TRY kurunu girin' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      min={0}
                      step={0.0001}
                      precision={4}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="eur_to_try"
                    label="EUR/TRY"
                    rules={[{ required: true, message: 'Lütfen EUR/TRY kurunu girin' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      min={0}
                      step={0.0001}
                      precision={4}
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