import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Form,
  InputNumber,
  Input,
  Typography,
  Row,
  Col,
  Card,
  Modal,
  message,
  Spin,
  Popconfirm,
  Space
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const KdvSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [kdvRates, setKdvRates] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!window.api) {
      message.error('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
    fetchKdvRates();
  }, []);

  const fetchKdvRates = async () => {
    try {
      setLoading(true);
      const data = await window.api.getKdvRates();
      setKdvRates(data || []);
    } catch (error) {
      message.error(error.message || 'KDV oranları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      rate: record.rate,
      label: record.label || ''
    });
    setModalOpen(true);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      const payload = {
        rate: values.rate,
        label: values.label ? values.label.trim() : ''
      };

      if (editingId) {
        await window.api.updateKdvRate(editingId, payload);
        message.success('KDV oranı başarıyla güncellendi.');
      } else {
        await window.api.addKdvRate(payload);
        message.success('KDV oranı başarıyla eklendi.');
      }

      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      fetchKdvRates();
    } catch (error) {
      message.error(error.message || 'KDV oranı kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await window.api.deleteKdvRate(record.id);
      message.success('KDV oranı başarıyla silindi.');
      fetchKdvRates();
    } catch (error) {
      message.error(error.message || 'KDV oranı silinirken bir hata oluştu.');
    }
  };

  const columns = [
    {
      title: 'Oran (%)',
      dataIndex: 'rate',
      key: 'rate',
      sorter: (a, b) => a.rate - b.rate,
      defaultSortOrder: 'ascend',
      render: value => (typeof value === 'number' ? `${value}%` : '-')
    },
    {
      title: 'Açıklama',
      dataIndex: 'label',
      key: 'label',
      render: value => value || '-'
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
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="KDV oranını sil"
            description="Bu oranı silmek mevcut faturaları etkilemez — onlar kaydedildikleri orana sahip olmaya devam eder."
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
        <Col span={16}>
          <Title level={2}>KDV Oranları Yönetimi</Title>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
          >
            Yeni KDV Oranı
          </Button>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="KDV Oranları Listesi">
            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={kdvRates}
                rowKey="id"
                pagination={false}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingId ? 'KDV Oranı Düzenle' : 'Yeni KDV Oranı'}
        open={modalOpen}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText={editingId ? 'Güncelle' : 'Ekle'}
        cancelText="İptal"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ rate: 0, label: '' }}
        >
          <Form.Item
            name="rate"
            label="Oran"
            rules={[
              { required: true, message: 'Lütfen KDV oranı girin' },
              {
                type: 'number',
                min: 0,
                max: 100,
                message: 'KDV oranı 0 ile 100 arasında olmalıdır'
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              step={0.5}
              precision={2}
              addonAfter="%"
            />
          </Form.Item>
          <Form.Item
            name="label"
            label="Açıklama"
          >
            <Input placeholder="Örn: Standart KDV" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KdvSettings;
