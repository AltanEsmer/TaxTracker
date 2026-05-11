// FxRates — Quiet Premium redesign (Slice 4)
import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Spin, message, Popconfirm, InputNumber, Select } from 'antd';
import { CalendarOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { TopBarContext } from '../App';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTH_OPTIONS = MONTHS_TR.map((m, i) => ({ label: m, value: i + 1 }));

const now = new Date();

const FxRates = () => {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [usd1, setUsd1] = useState(0);
  const [usd2, setUsd2] = useState(0);
  const [usd3, setUsd3] = useState(0);
  const [eur1, setEur1] = useState(0);
  const [eur2, setEur2] = useState(0);
  const [eur3, setEur3] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [rates, setRates] = useState([]);
  const [invoiceCounts, setInvoiceCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isEditing = editingId != null;

  const { setRight } = useContext(TopBarContext);

  const usdAvg = useMemo(() => {
    const vals = [usd1, usd2, usd3].map(Number).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [usd1, usd2, usd3]);

  const eurAvg = useMemo(() => {
    const vals = [eur1, eur2, eur3].map(Number).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [eur1, eur2, eur3]);

  const sortedRates = useMemo(() =>
    [...rates].sort((a, b) => b.year - a.year || b.month - a.month).slice(0, 12)
  , [rates]);

  const affectedCount = invoiceCounts[`${year}-${month}`] ?? 0;

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getFxRates();
      setRates(Array.isArray(data) ? data : []);
      const counts = {};
      const allInvoices = await window.api.getInvoices({});
      for (const inv of allInvoices || []) {
        if (inv.currency === 'TRY') continue;
        const d = new Date(inv.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      setInvoiceCounts(counts);
    } catch (e) {
      message.error(`Kurlar yüklenemedi: ${e?.message || ''}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  useEffect(() => {
    setRight(
      <span className="pill-filter"><CalendarOutlined />{year}</span>
    );
    return () => setRight(null);
  }, [setRight, year]);

  const handleSave = async () => {
    if (usdAvg <= 0 || eurAvg <= 0) { message.warning('USD ve EUR için en az bir geçerli değer girin'); return; }
    setSaving(true);
    try {
      const payload = { year, month, usd_to_try: usdAvg, eur_to_try: eurAvg };
      if (editingId) await window.api.updateFxRate(editingId, payload);
      else await window.api.addFxRate(payload);
      message.success(editingId ? 'Kur güncellendi' : 'Kur eklendi');
      handleReset();
      fetchRates();
    } catch (e) {
      message.error(`Kayıt başarısız: ${e?.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rate) => {
    setEditingId(rate.id);
    setYear(rate.year);
    setMonth(rate.month);
    setUsd1(rate.usd_to_try);
    setUsd2(0);
    setUsd3(0);
    setEur1(rate.eur_to_try);
    setEur2(0);
    setEur3(0);
  };

  const handleDelete = async (id) => {
    try {
      await window.api.deleteFxRate(id);
      message.success('Kur silindi');
      if (id === editingId) handleReset();
      fetchRates();
    } catch (e) {
      message.error(`Silinemedi: ${e?.message || ''}`);
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setUsd1(0); setUsd2(0); setUsd3(0);
    setEur1(0); setEur2(0); setEur3(0);
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  if (loading) {
    return (
      <div className="tt-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="tt-page">
      <div className="fx-grid">
        <div className="card fx-card">
          <h3>Aylık Kur Ekle / Düzenle</h3>
          <div className="fx-period">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Yıl</label>
              <InputNumber className="input-lg" style={{ width: '100%' }} value={year} onChange={setYear} disabled={isEditing} min={2000} max={2099} controls={false} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label">Ay</label>
              <Select className="input-lg" style={{ width: '100%' }} value={month} onChange={setMonth} disabled={isEditing} options={MONTH_OPTIONS} />
            </div>
          </div>

          <div className="fx-cur-block usd">
            <div className="head">
              <span className="ttl">USD <span className="pair">/ TRY</span></span>
              <span className="caps">3 örnek alınıp ortalanacak</span>
            </div>
            <div className="inputs">
              <InputNumber className="input-lg" value={usd1} onChange={setUsd1} controls={false} step={0.0001} min={0} decimalSeparator="," />
              <InputNumber className="input-lg" value={usd2} onChange={setUsd2} controls={false} step={0.0001} min={0} decimalSeparator="," />
              <InputNumber className="input-lg" value={usd3} onChange={setUsd3} controls={false} step={0.0001} min={0} decimalSeparator="," />
            </div>
            <div className="avg">
              <span className="l">Ortalama · $1 =</span>
              <span className="v"><span className="cur">₺</span>{usdAvg.toFixed(4).replace('.', ',')}</span>
            </div>
          </div>

          <div className="fx-cur-block eur">
            <div className="head">
              <span className="ttl">EUR <span className="pair">/ TRY</span></span>
              <span className="caps">3 örnek alınıp ortalanacak</span>
            </div>
            <div className="inputs">
              <InputNumber className="input-lg" value={eur1} onChange={setEur1} controls={false} step={0.0001} min={0} decimalSeparator="," />
              <InputNumber className="input-lg" value={eur2} onChange={setEur2} controls={false} step={0.0001} min={0} decimalSeparator="," />
              <InputNumber className="input-lg" value={eur3} onChange={setEur3} controls={false} step={0.0001} min={0} decimalSeparator="," />
            </div>
            <div className="avg">
              <span className="l">Ortalama · €1 =</span>
              <span className="v"><span className="cur">₺</span>{eurAvg.toFixed(4).replace('.', ',')}</span>
            </div>
          </div>

          {affectedCount > 0 && (
            <div className="fx-note">
              <InfoCircleOutlined />
              <span>Kuru güncellediğinizde tüm USD/EUR faturalar yeniden hesaplanır. {MONTHS_TR[month - 1]} ayı için <strong>{affectedCount} fatura</strong> etkilenecek.</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <Button onClick={handleReset}>Sıfırla</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>{isEditing ? 'Kuru Güncelle' : 'Kuru Kaydet'}</Button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '22px 24px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-block', width: 3, height: 14, borderRadius: 2, background: 'var(--color-primary-600)' }} />
              Kayıtlı Kurlar
            </h3>
            <span className="caps">son 12 ay</span>
          </div>

          <table className="ti">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Dönem</th>
                <th className="num">USD / TRY</th>
                <th className="num">EUR / TRY</th>
                <th className="num">Fatura</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedRates.map(rate => {
                const isActive = rate.year === year && rate.month === month;
                return (
                  <tr key={rate.id}>
                    <td>
                      <strong style={{ fontWeight: 500 }}>{MONTHS_TR[rate.month - 1]} · {rate.year}</strong>
                      {isActive && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-primary-600)', fontFamily: 'var(--font-mono)' }}>aktif</span>}
                    </td>
                    <td className="num"><span style={{ color: 'var(--cc-usd)', fontWeight: 500 }}>{Number(rate.usd_to_try).toFixed(4).replace('.', ',')}</span></td>
                    <td className="num"><span style={{ color: 'var(--cc-eur)', fontWeight: 500 }}>{Number(rate.eur_to_try).toFixed(4).replace('.', ',')}</span></td>
                    <td className="num">{invoiceCounts[`${rate.year}-${rate.month}`] ?? 0}</td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <span className="tt-icon-btn" onClick={() => handleEdit(rate)} title="Düzenle"><EditOutlined /></span>
                        <Popconfirm title="Bu kur silinsin mi?" onConfirm={() => handleDelete(rate.id)} okText="Sil" cancelText="İptal">
                          <span className="tt-icon-btn" title="Sil"><DeleteOutlined /></span>
                        </Popconfirm>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FxRates;
