import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  InputNumber, 
  Typography, 
  Row, 
  Col, 
  Card, 
  message, 
  Spin,
  Divider
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined 
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const InvoiceForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [fxRates, setFxRates] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      fetchInvoice(id);
    }
    
    // Fetch current month's FX rates
    fetchCurrentFxRates();
  }, [id]);

  const fetchCurrentFxRates = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const rates = await window.api.getFxRates(year, month);
      
      if (rates && rates.length > 0) {
        setFxRates(rates[0]);
      } else {
        message.warning('Bu ay için kur bilgisi bulunamadı. Lütfen Kur Yönetimi sayfasından ekleyin.');
      }
    } catch (error) {
      console.error('Error fetching FX rates:', error);
    }
  };

  const fetchInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      // Get all invoices and find the one with matching ID
      const invoices = await window.api.getInvoices();
      const invoice = invoices.find(inv => inv.id === parseInt(invoiceId));
      
      if (invoice) {
        setCurrentInvoice(invoice);
        form.setFieldsValue({
          ...invoice,
          date: dayjs(invoice.date)
        });
      } else {
        message.error('Fatura bulunamadı.');
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      message.error('Fatura yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Format the date
      const formattedValues = {
        ...values,
        date: values.date.format('YYYY-MM-DD')
      };
      
      if (isEditing) {
        await window.api.updateInvoice(parseInt(id), formattedValues);
        message.success('Fatura başarıyla güncellendi.');
      } else {
        await window.api.addInvoice(formattedValues);
        message.success('Fatura başarıyla eklendi.');
      }
      
      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      message.error('Fatura kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const subtotal = form.getFieldValue('subtotal') || 0;
    const vatRate = form.getFieldValue('vat_rate') || 0;
    
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    
    form.setFieldsValue({ total });
    return total;
  };

  const getTryEquivalent = () => {
    if (!fxRates) return null;
    
    const subtotal = form.getFieldValue('subtotal') || 0;
    const currency = form.getFieldValue('currency');
    
    if (currency === 'TRY') {
      return subtotal;
    } else if (currency === 'USD' && fxRates.usd_to_try) {
      return subtotal * fxRates.usd_to_try;
    } else if (currency === 'EUR' && fxRates.eur_to_try) {
      return subtotal * fxRates.eur_to_try;
    }
    
    return null;
  };

  const tryEquivalent = getTryEquivalent();

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" className="page-header">
        <Col span={16}>
          <Title level={2}>{isEditing ? 'Fatura Düzenle' : 'Yeni Fatura'}</Title>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/invoices')}
          >
            Geri Dön
          </Button>
        </Col>
      </Row>

      <Card>
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              date: dayjs(),
              currency: 'TRY',
              vat_rate: 18,
              subtotal: 0,
              total: 0,
              invoice_type: 'Alış'
            }}
            className="form-container"
          >
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="date"
                  label="Tarih"
                  rules={[{ required: true, message: 'Lütfen tarih seçin' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }} 
                    format="DD/MM/YYYY" 
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="invoice_type"
                  label="Fatura Tipi"
                  rules={[{ required: true, message: 'Lütfen fatura tipi seçin' }]}
                >
                  <Select>
                    <Option value="Alış">Alış</Option>
                    <Option value="Satış">Satış</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="company"
                  label="Şirket İsmi"
                  rules={[{ required: true, message: 'Lütfen şirket ismi girin' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="invoice_no"
                  label="Fatura No"
                  rules={[{ required: true, message: 'Lütfen fatura numarası girin' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ background: form.getFieldValue('invoice_type') === 'Alış' ? '#1890ff' : '#52c41a' }} />

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="subtotal"
                  label="Ara Toplam"
                  rules={[{ required: true, message: 'Lütfen ara toplam girin' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    precision={2}
                    onChange={calculateTotal}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="vat_rate"
                  label="KDV Oranı (%)"
                  rules={[{ required: true, message: 'Lütfen KDV oranı girin' }]}
                >
                  <Select onChange={calculateTotal}>
                    <Option value={0}>0%</Option>
                    <Option value={5}>5%</Option>
                    <Option value={10}>10%</Option>
                    <Option value={16}>16%</Option>
                    <Option value={20}>20%</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="currency"
                  label="Para Birimi"
                  rules={[{ required: true, message: 'Lütfen para birimi seçin' }]}
                >
                  <Select onChange={calculateTotal}>
                    <Option value="TRY">TRY</Option>
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="total"
                  label="Genel Toplam"
                >
                  <InputNumber 
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    precision={2}
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                {tryEquivalent !== null && form.getFieldValue('currency') !== 'TRY' && (
                  <div style={{ marginTop: 29 }}>
                    <strong>TL Karşılığı:</strong> {tryEquivalent.toFixed(2)} TL
                    {fxRates && (
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        Kur: {form.getFieldValue('currency') === 'USD' ? fxRates.usd_to_try : fxRates.eur_to_try} TL
                      </div>
                    )}
                  </div>
                )}
              </Col>
              <Col span={8} style={{ textAlign: 'right', marginTop: 30 }}>
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                  >
                    {isEditing ? 'Güncelle' : 'Kaydet'}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default InvoiceForm; 