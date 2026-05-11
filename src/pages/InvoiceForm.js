// InvoiceForm — Quiet Premium redesign with multi-line KDV support.
import { useContext, useEffect, useMemo, useState } from 'react';
import { Input, DatePicker, Segmented, Button, Spin, message } from 'antd';
import { SaveOutlined, ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import InvoiceFormMoneyZone from '../components/InvoiceFormMoneyZone';
import InvoiceFormLineItems, { computeInvoiceTotals } from '../components/InvoiceFormLineItems';
import { TopBarContext } from '../App';

dayjs.locale('tr');

const { TextArea } = Input;

const defaultLineItem = () => ({
  id: 1,
  description: '',
  subtotal: 0,
  vat_rate: 20,
  vat_amount: 0,
});

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
  const [lineItems, setLineItems] = useState([defaultLineItem()]);
  const [manualTotal, setManualTotal] = useState(false);
  const [manualTotalValue, setManualTotalValue] = useState(0);
  const [fxRate, setFxRate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [customKdvRates, setCustomKdvRates] = useState([]);

  // Fetch custom KDV rates once on mount
  useEffect(() => {
    if (!window.api?.getKdvRates) return;
    window.api.getKdvRates()
      .then(rows => setCustomKdvRates(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, []);

  // Aggregate totals derived live from line items
  const totals = useMemo(() => computeInvoiceTotals(lineItems), [lineItems]);
  const manualTotalAllowed = lineItems.length === 1;

  // If line count changes such that manual override is no longer allowed, disable it.
  useEffect(() => {
    if (!manualTotalAllowed && manualTotal) {
      setManualTotal(false);
    }
  }, [manualTotalAllowed, manualTotal]);

  // Keep manualTotalValue tracking the computed total when manual override is off,
  // so toggling the switch starts from the current computed value.
  useEffect(() => {
    if (!manualTotal) setManualTotalValue(totals.total);
  }, [totals.total, manualTotal]);

  // Merge default KDV rates with the user's custom rates and any rates present in current lines.
  const vatOptions = useMemo(() => {
    const map = new Map();
    [0, 5, 10, 16, 20].forEach(r => map.set(r, { rate: r }));
    customKdvRates.forEach(r => {
      const rateNum = Number(r.rate);
      if (Number.isFinite(rateNum)) map.set(rateNum, { rate: rateNum, label: r.label });
    });
    lineItems.forEach(li => {
      const rateNum = Number(li.vat_rate);
      if (Number.isFinite(rateNum) && !map.has(rateNum)) map.set(rateNum, { rate: rateNum });
    });
    return [...map.values()].sort((a, b) => a.rate - b.rate);
  }, [customKdvRates, lineItems]);

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

      // Prefer stored line_items (post-migration these always exist). Fall back to a synthesized
      // single line for any legacy record that somehow slipped through.
      const storedLines = Array.isArray(inv.line_items) && inv.line_items.length > 0
        ? inv.line_items.map((li, idx) => ({
            id: Number.isFinite(li.id) ? li.id : idx + 1,
            description: li.description || '',
            subtotal: Number(li.subtotal) || 0,
            vat_rate: Number(li.vat_rate) || 0,
            vat_amount: Number(li.vat_amount) || 0,
          }))
        : [{
            id: 1,
            description: inv.description || '',
            subtotal: Number(inv.subtotal) || 0,
            vat_rate: Number(inv.vat_rate) || 0,
            vat_amount: (Number(inv.subtotal) || 0) * ((Number(inv.vat_rate) || 0) / 100),
          }];
      setLineItems(storedLines);

      // Detect manual total override (only possible for single-line invoices)
      const computedTotal = storedLines.reduce(
        (acc, li) => acc + (li.subtotal + li.subtotal * (li.vat_rate / 100)),
        0,
      );
      const storedTotal = Number(inv.total) || 0;
      if (storedLines.length === 1 && Math.abs(storedTotal - computedTotal) > 0.01) {
        setManualTotal(true);
        setManualTotalValue(storedTotal);
      } else {
        setManualTotal(false);
        setManualTotalValue(storedTotal);
      }
    }).catch(() => {
      message.error('Fatura yüklenirken bir hata oluştu');
      navigate('/invoices');
    }).finally(() => setLoading(false));
  }, [id, isEditMode, navigate]);

  const hasValidLines = lineItems.some(li => Number(li.subtotal) > 0);
  const validationOk =
    company.trim() &&
    invoiceNo.trim() &&
    date &&
    invoiceType &&
    currency &&
    hasValidLines &&
    totals.total > 0;

  const handleSave = async (createAnother) => {
    if (!validationOk) { message.warning('Lütfen tüm zorunlu alanları doldurun'); return; }
    if (!window.api) { message.error('window.api bulunamadı'); return; }
    if (currency !== 'TRY' && (!fxRate || fxRate <= 0)) {
      message.warning(`${currency}/TRY kuru tanımlı değil. Kur Yönetimi sayfasından ${date?.format('MMMM YYYY')} ayı için kur ekleyin.`);
      return;
    }
    setSaving(true);

    const effectiveTotal = manualTotal && manualTotalAllowed ? Number(manualTotalValue) : totals.total;

    const payload = {
      company: company.trim(),
      invoice_no: invoiceNo.trim(),
      date: date.format('YYYY-MM-DD'),
      invoice_type: invoiceType,
      description: description.trim(),
      currency,
      line_items: lineItems.map((li) => ({
        id: li.id,
        description: (li.description || '').trim(),
        subtotal: Number(li.subtotal) || 0,
        vat_rate: Number(li.vat_rate) || 0,
        vat_amount: (Number(li.subtotal) || 0) * ((Number(li.vat_rate) || 0) / 100),
      })),
      subtotal: totals.subtotal,
      vat_rate: totals.vat_rate,
      vat_amount: totals.vat_amount,
      total: effectiveTotal,
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
          setLineItems([defaultLineItem()]);
          setManualTotal(false);
          setManualTotalValue(0);
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

        {/* RIGHT: currency + total + FX */}
        <InvoiceFormMoneyZone
          currency={currency}
          onCurrencyChange={setCurrency}
          computedTotal={totals.total}
          fxRate={fxRate}
          fxPeriodLabel={date ? dayjs(date).format('MMMM YYYY') : ''}
          manualTotal={manualTotal}
          manualTotalValue={manualTotalValue}
          onManualTotalChange={setManualTotalValue}
          onManualToggle={setManualTotal}
          manualTotalAllowed={manualTotalAllowed}
          fxMissing={currency !== 'TRY' && (!fxRate || fxRate <= 0)}
        />
      </div>

      {/* Line items section (full width below the grid) */}
      <div className="card form-card" style={{ marginTop: 20 }}>
        <InvoiceFormLineItems
          value={lineItems}
          onChange={setLineItems}
          vatOptions={vatOptions}
          currency={currency}
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
