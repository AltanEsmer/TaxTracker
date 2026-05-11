// InvoiceForm — Quiet Premium redesign (Slice 3)
import { useContext, useEffect, useState } from 'react';
import { Input, DatePicker, Segmented, Button, Spin, message } from 'antd';
import { SaveOutlined, ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import InvoiceFormMoneyZone from '../components/InvoiceFormMoneyZone';
import { TopBarContext } from '../App';

const { TextArea } = Input;

const InvoiceForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [company, setCompany] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(dayjs());
  const [invoiceType, setInvoiceType] = useState('Alış');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [subtotal, setSubtotal] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [total, setTotal] = useState(0);
  const [manualTotal, setManualTotal] = useState(false);
  const [fxRate, setFxRate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // Auto-compute total unless manual override
  useEffect(() => {
    if (!manualTotal) setTotal(Number(subtotal) * (1 + Number(vatRate) / 100));
  }, [subtotal, vatRate, manualTotal]);

  // Look up FX rate when date or currency changes
  useEffect(() => {
    if (currency === 'TRY' || !date) { setFxRate(null); return; }
    if (!window.api) return;
    const year = date.year();
    const month = date.month() + 1;
    window.api.getFxRates(year, month).then((rates) => {
      const row = Array.isArray(rates) ? rates[0] : rates;
      if (row) setFxRate(currency === 'USD' ? row.usd_to_try : row.eur_to_try);
      else setFxRate(null);
    }).catch(() => setFxRate(null));
  }, [currency, date]);

  // Edit mode: load existing invoice
  useEffect(() => {
    if (!isEditMode) return;
    if (!window.api) { message.error('window.api bulunamadı'); return; }
    setLoading(true);
    window.api.getInvoiceById(parseInt(id, 10)).then((inv) => {
      if (!inv) { message.error('Fatura bulunamadı'); navigate('/invoices'); return; }
      setCompany(inv.company);
      setInvoiceNo(inv.invoice_no);
      setDate(dayjs(inv.date));
      setInvoiceType(inv.invoice_type || 'Alış');
      setDescription(inv.description || '');
      setCurrency(inv.currency);
      setSubtotal(Number(inv.subtotal));
      setVatRate(Number(inv.vat_rate));
      setTotal(Number(inv.total));
      const computed = Number(inv.subtotal) * (1 + Number(inv.vat_rate) / 100);
      if (Math.abs(Number(inv.total) - computed) > 0.01) setManualTotal(true);
    }).catch(() => {
      message.error('Fatura yüklenirken bir hata oluştu');
      navigate('/invoices');
    }).finally(() => setLoading(false));
  }, [id, isEditMode, navigate]);

  const validationOk = company && invoiceNo && date && invoiceType && currency && subtotal > 0 && total > 0;

  const handleSave = async (createAnother) => {
    if (!validationOk) { message.warning('Lütfen tüm zorunlu alanları doldurun'); return; }
    if (!window.api) { message.error('window.api bulunamadı'); return; }
    setSaving(true);
    const vatAmount = Number(total) - Number(subtotal);
    const payload = {
      company: company.trim(),
      invoice_no: invoiceNo.trim(),
      date: date.format('YYYY-MM-DD'),
      invoice_type: invoiceType,
      description: description.trim(),
      currency,
      subtotal: Number(subtotal),
      vat_rate: Number(vatRate),
      vat_amount: vatAmount,
      total: Number(total),
    };
    try {
      if (isEditMode) {
        await window.api.updateInvoice(parseInt(id, 10), payload);
        message.success('Fatura güncellendi');
        navigate('/invoices');
      } else {
        await window.api.addInvoice(payload);
        message.success('Fatura eklendi');
        if (createAnother) {
          setCompany('');
          setInvoiceNo('');
          setDescription('');
          setSubtotal(0);
          setTotal(0);
          setManualTotal(false);
        } else {
          navigate('/invoices');
        }
      }
    } catch (e) {
      message.error(`Kayıt başarısız: ${e?.message || 'bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  // Topbar right slot
  const { setRight } = useContext(TopBarContext);
  useEffect(() => {
    setRight(
      isEditMode ? (
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClockCircleOutlined />Düzenleniyor
        </span>
      ) : null
    );
    return () => setRight(null);
  }, [setRight, isEditMode]);

  if (loading) {
    return (
      <div className="tt-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="tt-page">
      <div className="form-grid">
        {/* LEFT: metadata card */}
        <div className="card form-card">
          <h3>Fatura Bilgileri</h3>
          <div className="field-grid">
            <div className="field full">
              <label className="field-label">Şirket</label>
              <Input
                className="input-lg"
                placeholder="Şirket adı"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <span className="field-hint">Mevcut kayıtlardan seçin veya yeni şirket ekleyin</span>
            </div>
            <div className="field">
              <label className="field-label">Fatura No</label>
              <Input
                className="input-lg"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Tarih</label>
              <DatePicker
                className="input-lg"
                style={{ width: '100%' }}
                value={date}
                onChange={setDate}
                format="DD/MM/YYYY"
                allowClear={false}
              />
            </div>
            <div className="field full">
              <label className="field-label">Tür</label>
              <Segmented
                value={invoiceType}
                onChange={setInvoiceType}
                options={[
                  { label: 'Alış', value: 'Alış' },
                  { label: 'Satış', value: 'Satış' },
                ]}
              />
            </div>
            <div className="field full">
              <label className="field-label">Açıklama</label>
              <TextArea
                className="input-lg"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: money zone */}
        <InvoiceFormMoneyZone
          currency={currency}
          onCurrencyChange={setCurrency}
          subtotal={subtotal}
          onSubtotalChange={setSubtotal}
          vatRate={vatRate}
          onVatRateChange={setVatRate}
          fxRate={fxRate}
          fxPeriodLabel={date ? dayjs(date).locale('tr').format('MMMM YYYY') : ''}
          manualTotal={manualTotal}
          manualTotalValue={total}
          onManualTotalChange={setTotal}
          onManualToggle={setManualTotal}
        />
      </div>

      {/* Footer */}
      <div className="form-footer">
        <span className="meta">
          <InfoCircleOutlined />
          {validationOk
            ? 'Tüm zorunlu alanlar dolduruldu · değişiklikler geri alınabilir'
            : 'Lütfen zorunlu alanları doldurun'}
        </span>
        <div className="right">
          <Button onClick={() => navigate('/invoices')}>İptal</Button>
          {!isEditMode && (
            <Button onClick={() => handleSave(true)}>Kaydet & Yeni Ekle</Button>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => handleSave(false)}>
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
