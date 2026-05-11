// InvoiceFormMoneyZone — right-column money zone for the Invoice Form
import React, { useMemo } from 'react';
import { Segmented, InputNumber, Switch } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const DEFAULT_VAT_OPTIONS = [0, 5, 10, 16, 20].map(r => ({ rate: r }));
const CUR_SYMBOL = { TRY: '₺', USD: '$', EUR: '€' };

const fmt = (n) =>
  Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceFormMoneyZone({
  currency,
  onCurrencyChange,
  subtotal,
  onSubtotalChange,
  vatRate,
  onVatRateChange,
  fxRate,
  fxPeriodLabel = '',
  manualTotal = false,
  manualTotalValue,
  onManualTotalChange,
  onManualToggle,
  vatOptions = DEFAULT_VAT_OPTIONS,
  fxMissing = false,
}) {
  const computedTotal = useMemo(() => subtotal * (1 + vatRate / 100), [subtotal, vatRate]);
  const displayTotal = manualTotal && manualTotalValue != null ? manualTotalValue : computedTotal;
  const tryEquivalent = useMemo(() => displayTotal * (fxRate || 0), [displayTotal, fxRate]);
  const isForeign = currency !== 'TRY';
  const sym = CUR_SYMBOL[currency] || '₺';

  return (
    <div className="money-zone">
      <h3>Tutar</h3>

      <div className="field" style={{ marginBottom: 18 }}>
        <label className="field-label">Para Birimi</label>
        <Segmented
          value={currency}
          onChange={onCurrencyChange}
          options={[
            { label: 'TRY · ₺', value: 'TRY' },
            { label: 'USD · $', value: 'USD' },
            { label: 'EUR · €', value: 'EUR' },
          ]}
        />
      </div>

      <div className="field" style={{ marginBottom: 18 }}>
        <label className="field-label">Tutar (KDV hariç)</label>
        <div className="money-prefix-wrap" data-prefix={sym}>
          <InputNumber
            className="money-amount"
            value={subtotal}
            onChange={(v) => onSubtotalChange(Number(v) || 0)}
            controls={false}
            decimalSeparator=","
            min={0}
            step={0.01}
            disabled={manualTotal}
            formatter={(v) =>
              v == null ? '' : Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }
            parser={(v) => Number(String(v || '').replace(/\./g, '').replace(',', '.')) || 0}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 18 }}>
        <label className="field-label">KDV Oranı</label>
        <div className="vat-chips">
          {vatOptions.map((opt) => (
            <button
              key={opt.rate}
              type="button"
              title={opt.label || `%${opt.rate} KDV`}
              className={opt.rate === vatRate ? 'active' : ''}
              onClick={() => onVatRateChange(opt.rate)}
            >
              %{opt.rate}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Manuel toplam</span>
          <Switch size="small" checked={manualTotal} onChange={onManualToggle} />
        </label>
        {manualTotal && (
          <div className="money-prefix-wrap" data-prefix={sym}>
            <InputNumber
              className="money-amount"
              value={manualTotalValue}
              onChange={(v) => onManualTotalChange(Number(v) || 0)}
              controls={false}
              decimalSeparator=","
              min={0}
              step={0.01}
              formatter={(v) =>
                v == null ? '' : Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
              parser={(v) => Number(String(v || '').replace(/\./g, '').replace(',', '.')) || 0}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      <div className="total-display">
        <div>
          <div className="lab">Toplam</div>
          <div className="caps">KDV dahil · {currency}</div>
        </div>
        <div className="v">
          <span className="cur">{sym}</span>
          {fmt(displayTotal).split(',')[0]}
          <span style={{ opacity: 0.55 }}>,{fmt(displayTotal).split(',')[1] ?? '00'}</span>
        </div>
      </div>

      {isForeign && fxMissing && (
        <div className="fx-reveal" role="note" style={{ borderColor: 'rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.06)' }}>
          <span className="ico" style={{ color: 'var(--color-danger)' }}><SwapOutlined /></span>
          <div className="body">
            <div className="t" style={{ color: 'var(--color-danger)' }}>
              {fxPeriodLabel} {currency}/TRY kuru tanımlı değil
            </div>
            <div className="s">
              Kur Yönetimi sayfasından bu ay için kur ekleyin
            </div>
          </div>
        </div>
      )}
      {isForeign && !fxMissing && (
        <div className="fx-reveal" role="note">
          <span className="ico"><SwapOutlined /></span>
          <div className="body">
            <div className="t">
              {fxPeriodLabel} {currency}/TRY kuru kullanılıyor
            </div>
            <div className="s">
              {sym}1 <span className="x">=</span> ₺{fxRate ? fxRate.toFixed(4).replace('.', ',') : '—'}
              <span className="x">·</span> Kur Yönetimi sayfasından düzenleyin
            </div>
          </div>
          <div className="equiv">
            ≈ ₺{fmt(tryEquivalent)}
            <small>TRY karşılığı</small>
          </div>
        </div>
      )}
    </div>
  );
}
