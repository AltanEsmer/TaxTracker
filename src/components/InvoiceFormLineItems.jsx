// InvoiceFormLineItems — editable per-line-item KDV table for the Invoice Form.
import React, { useMemo } from 'react';
import { Input, InputNumber, Button, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const CUR_SYMBOL = { TRY: '₺', USD: '$', EUR: '€' };
const DEFAULT_VAT_OPTIONS = [0, 5, 10, 16, 20].map((r) => ({ rate: r }));

const fmt = (n) =>
  Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const numberFormatter = (v) =>
  v == null ? '' : Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberParser = (v) => Number(String(v || '').replace(/\./g, '').replace(',', '.')) || 0;

export default function InvoiceFormLineItems({
  value = [],
  onChange,
  vatOptions = DEFAULT_VAT_OPTIONS,
  currency = 'TRY',
}) {
  const sym = CUR_SYMBOL[currency] || '₺';

  const totals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    const rateSet = new Set();
    for (const li of value) {
      const liSubtotal = Number(li.subtotal) || 0;
      const liRate = Number(li.vat_rate) || 0;
      subtotal += liSubtotal;
      vat += liSubtotal * (liRate / 100);
      rateSet.add(Math.round(liRate * 100) / 100);
    }
    const sharedRate = rateSet.size === 1 ? [...rateSet][0] : null;
    return {
      subtotal,
      vat_amount: vat,
      total: subtotal + vat,
      shared_rate: sharedRate,
      distinct_rates: [...rateSet].sort((a, b) => a - b),
    };
  }, [value]);

  const updateLine = (index, patch) => {
    const next = value.map((li, i) => (i === index ? { ...li, ...patch } : li));
    onChange(next);
  };

  const addLine = () => {
    const nextId = value.length === 0 ? 1 : Math.max(...value.map((li) => Number(li.id) || 0)) + 1;
    const defaultRate = value.length > 0 ? Number(value[value.length - 1].vat_rate) || 20 : 20;
    onChange([
      ...value,
      { id: nextId, description: '', subtotal: 0, vat_rate: defaultRate, vat_amount: 0 },
    ]);
  };

  const removeLine = (index) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="line-items-zone">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Fatura Kalemleri</h3>
        {totals.shared_rate === null ? (
          <Tooltip title={`Karışık oranlar: ${totals.distinct_rates.map((r) => `%${r}`).join(', ')}`}>
            <Tag color="gold">Karışık KDV</Tag>
          </Tooltip>
        ) : (
          <Tag color="blue">%{totals.shared_rate} KDV</Tag>
        )}
      </div>

      <div className="line-items-table" role="table">
        <div className="line-items-row line-items-header" role="row">
          <div role="columnheader">Açıklama</div>
          <div role="columnheader">Tutar (KDV hariç)</div>
          <div role="columnheader">KDV Oranı</div>
          <div role="columnheader">KDV Tutarı</div>
          <div role="columnheader">Satır Toplamı</div>
          <div role="columnheader" />
        </div>

        {value.map((li, idx) => {
          const liSubtotal = Number(li.subtotal) || 0;
          const liRate = Number(li.vat_rate) || 0;
          const liVat = liSubtotal * (liRate / 100);
          const liTotal = liSubtotal + liVat;
          return (
            <div className="line-items-row" role="row" key={li.id ?? idx}>
              <div role="cell">
                <Input
                  placeholder="Ürün / hizmet açıklaması"
                  value={li.description}
                  onChange={(e) => updateLine(idx, { description: e.target.value })}
                />
              </div>
              <div role="cell">
                <div className="money-prefix-wrap" data-prefix={sym}>
                  <InputNumber
                    className="money-amount"
                    value={li.subtotal}
                    onChange={(v) => updateLine(idx, { subtotal: Number(v) || 0 })}
                    controls={false}
                    decimalSeparator=","
                    min={0}
                    step={0.01}
                    formatter={numberFormatter}
                    parser={numberParser}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div role="cell">
                <div className="vat-chips vat-chips-compact">
                  {vatOptions.map((opt) => (
                    <button
                      key={opt.rate}
                      type="button"
                      title={opt.label || `%${opt.rate} KDV`}
                      className={Number(opt.rate) === liRate ? 'active' : ''}
                      onClick={() => updateLine(idx, { vat_rate: Number(opt.rate) })}
                    >
                      %{opt.rate}
                    </button>
                  ))}
                </div>
              </div>
              <div role="cell" className="line-item-readonly">
                {sym}{fmt(liVat)}
              </div>
              <div role="cell" className="line-item-readonly">
                {sym}{fmt(liTotal)}
              </div>
              <div role="cell" style={{ textAlign: 'right' }}>
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  disabled={value.length <= 1}
                  onClick={() => removeLine(idx)}
                  aria-label={`Satır ${idx + 1} sil`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10 }}>
        <Button icon={<PlusOutlined />} onClick={addLine}>Satır Ekle</Button>
      </div>

      <div className="line-items-summary">
        <div>
          <span className="lab">Ara Toplam</span>
          <span className="v">{sym}{fmt(totals.subtotal)}</span>
        </div>
        <div>
          <span className="lab">KDV</span>
          <span className="v">{sym}{fmt(totals.vat_amount)}</span>
        </div>
        <div>
          <span className="lab">Genel Toplam</span>
          <span className="v"><strong>{sym}{fmt(totals.total)}</strong></span>
        </div>
      </div>
    </div>
  );
}

// Helper exported so the parent can use the same total computation for save payload.
export function computeInvoiceTotals(lineItems) {
  let subtotal = 0;
  let vat = 0;
  const rateSet = new Set();
  for (const li of lineItems) {
    const liSubtotal = Number(li.subtotal) || 0;
    const liRate = Number(li.vat_rate) || 0;
    subtotal += liSubtotal;
    vat += liSubtotal * (liRate / 100);
    rateSet.add(Math.round(liRate * 100) / 100);
  }
  return {
    subtotal,
    vat_amount: vat,
    total: subtotal + vat,
    vat_rate: rateSet.size === 1 ? [...rateSet][0] : null,
  };
}
