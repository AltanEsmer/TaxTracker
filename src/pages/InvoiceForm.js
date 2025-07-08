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
  Divider,
  Switch
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
  const [manualTotal, setManualTotal] = useState(false);
  const [tryValues, setTryValues] = useState({
    subtotal: 0,
    vatAmount: 0,
    total: 0
  });
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.api) {
      message.error('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
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
        updateTryValues(invoice.subtotal, invoice.vat_rate, invoice.total, invoice.currency);
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
        date: values.date.format('YYYY-MM-DD'),
        try_equivalent: {
          subtotal: tryValues.subtotal,
          vat_amount: tryValues.vatAmount,
          total: tryValues.total
        }
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
    if (manualTotal) return;
    
    const subtotal = form.getFieldValue('subtotal') || 0;
    const vatRate = form.getFieldValue('vat_rate') || 0;
    
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    
    form.setFieldsValue({ total });
    
    // Update TRY values
    updateTryValues(subtotal, vatRate, total, form.getFieldValue('currency'));
    
    return total;
  };

  const updateTryValues = (subtotal, vatRate, total, currency) => {
    if (!fxRates || !currency) return;
    
    let rate = 1;
    if (currency === 'USD' && fxRates.usd_to_try) {
      rate = parseFloat(fxRates.usd_to_try);
    } else if (currency === 'EUR' && fxRates.eur_to_try) {
      rate = parseFloat(fxRates.eur_to_try);
    }
    
    const trySubtotal = subtotal * rate;
    const tryVatAmount = (subtotal * (vatRate / 100)) * rate;
    const tryTotal = total * rate;
    
    console.log('Currency:', currency, 'Rate:', rate, 'TRY Total:', tryTotal);
    
    setTryValues({
      subtotal: trySubtotal,
      vatAmount: tryVatAmount,
      total: tryTotal
    });
  };

  const handleTotalChange = (value) => {
    if (!manualTotal) return;
    
    // When manually changing total, calculate subtotal based on the VAT rate
    const vatRate = form.getFieldValue('vat_rate') || 0;
    const total = value || 0;
    
    // Calculate subtotal: total / (1 + vatRate/100)
    const subtotal = vatRate === 0 ? total : total / (1 + vatRate / 100);
    
    // Update the subtotal field
    form.setFieldsValue({ subtotal: parseFloat(subtotal.toFixed(2)) });
    
    // Update the TRY equivalent
    updateTryValues(
      subtotal,
      vatRate,
      total,
      form.getFieldValue('currency')
    );
  };

  const handleManualTotalChange = (checked) => {
    setManualTotal(checked);
    if (!checked) {
      // If switching back to automatic, recalculate the total
      calculateTotal();
    }
  };

  const currencyChangeHandler = (value) => {
    // Recalculate total when currency changes
    setTimeout(() => {
      calculateTotal();
    }, 0);
  };

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
              vat_rate: 0,
              subtotal: 0,
              total: 0,
              invoice_type: 'Alış'
            }}
            className="form-container"
          >
            <Row gutter={16}>
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
            </Row>

            <Row gutter={16}>
              <Col span={12}>
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
                <div style={{ marginTop: -15, marginBottom: 16 }}>
                  <small style={{ color: '#888' }}>KDV Tutarı (TL): {tryValues.vatAmount.toFixed(2)} TL</small>
                </div>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="currency"
                  label="Para Birimi"
                  rules={[{ required: true, message: 'Lütfen para birimi seçin' }]}
                >
                  <Select onChange={currencyChangeHandler}>
                    <Option value="TRY">TRY</Option>
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                  </Select>
                </Form.Item>
                {fxRates && form.getFieldValue('currency') !== 'TRY' && (
                  <div style={{ marginTop: -15, marginBottom: 16 }}>
                    <small style={{ color: '#888' }}>
                      Kur: {form.getFieldValue('currency') === 'USD' ? fxRates.usd_to_try : fxRates.eur_to_try} TL
                    </small>
                  </div>
                )}
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
                    disabled={manualTotal}
                  />
                </Form.Item>
                <div style={{ marginTop: -15, marginBottom: 16 }}>
                  <small style={{ color: '#888' }}>TL Karşılığı: {tryValues.subtotal.toFixed(2)} TL</small>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Form.Item
                    name="total"
                    label="Genel Toplam"
                    style={{ flex: 1, marginRight: 8 }}
                    rules={[{ required: true, message: 'Genel toplam gerekli' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                      disabled={!manualTotal}
                      onChange={handleTotalChange}
                    />
                  </Form.Item>
                  <Form.Item label="Manuel">
                    <Switch checked={manualTotal} onChange={handleManualTotalChange} />
                  </Form.Item>
                </div>
                <div style={{ marginTop: -15 }}>
                  <small style={{ color: '#888' }}>TL Karşılığı: {tryValues.total.toFixed(2)} TL</small>
                </div>
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