// InvoiceFormMoneyZone — currency + total + FX zone for the Invoice Form.
// Subtotal and KDV inputs moved into InvoiceFormLineItems.
import React, { useMemo } from 'react';
import { Segmented, InputNumber, Switch, Tooltip } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const CUR_SYMBOL = { TRY: '₺', USD: '$', EUR: '€' };

const fmt = (n) =>
  Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceFormMoneyZone({
  currency,
  onCurrencyChange,
  computedTotal = 0,
  fxRate,
  fxPeriodLabel = '',
  manualTotal = false,
  manualTotalValue,
  onManualTotalChange,
  onManualToggle,
  manualTotalAllowed = false,
  fxMissing = false,
}) {
  const displayTotal = manualTotal && manualTotalValue != null ? manualTotalValue : computedTotal;
  const tryEquivalent = useMemo(() => displayTotal * (fxRate || 0), [displayTotal, fxRate]);
  const isForeign = currency !== 'TRY';
  const sym = CUR_SYMBOL[currency] || '₺';

  return (
    <div className="money-zone">
      <h3>Tutar & Para Birimi</h3>

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

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Manuel toplam</span>
          <Tooltip
            title={
              manualTotalAllowed
                ? 'Hesaplanan toplam yerine elle bir değer girin'
                : 'Manuel toplam yalnızca tek kalemli faturalarda kullanılabilir'
            }
          >
            <Switch
              size="small"
              checked={manualTotal}
              onChange={onManualToggle}
              disabled={!manualTotalAllowed}
            />
          </Tooltip>
        </label>
        {manualTotal && manualTotalAllowed && (
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
