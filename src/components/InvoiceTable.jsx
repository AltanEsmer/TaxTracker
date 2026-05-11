// InvoiceTable — premium AntD table for the Faturalar page
import React from 'react';
import { Table, Tag, Tooltip } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const fmtTRY = (n) =>
  '₺ ' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCur = (n, code) => {
  const sym = code === 'USD' ? '$' : code === 'EUR' ? '€' : '₺';
  return sym + ' ' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CURRENCY_COLOR = { TRY: 'var(--cc-try)', USD: 'var(--cc-usd)', EUR: 'var(--cc-eur)' };

const DateCell = ({ value }) => (
  <span style={{ font: '500 12.5px "JetBrains Mono"', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
    {dayjs(value).format('DD/MM/YYYY')}
  </span>
);

const CompanyCell = ({ name, invoiceNo, description }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
    <span style={{ font: '500 13px "Inter Tight"', color: 'var(--text-primary)' }}>{name}</span>
    <span style={{ font: '400 12px "Inter Tight"', color: 'var(--text-tertiary)' }}>
      <span style={{ font: '500 12px "JetBrains Mono"' }}>{invoiceNo}</span>
      {description && <> · {description}</>}
    </span>
  </div>
);

const TypeChip = ({ type }) => {
  const isAlis = type === 'Alış' || type === 'alis';
  return (
    <Tag
      style={{
        borderRadius: 999,
        padding: '2px 8px',
        margin: 0,
        background: isAlis ? '#e8edff' : '#fbeed6',
        color: isAlis ? '#1832b8' : '#8c4a14',
        border: 0,
        font: '500 11.5px "Inter Tight"',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor', opacity: 0.85 }} />
      {isAlis ? 'Alış' : 'Satış'}
    </Tag>
  );
};

const AmountCell = ({ amount, currency, tryEquivalent }) => {
  const isForeign = currency !== 'TRY';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <span
        style={{
          font: '500 13px "JetBrains Mono"',
          color: isForeign ? CURRENCY_COLOR[currency] : 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtCur(amount, currency)}
      </span>
      {isForeign ? (
        tryEquivalent != null ? (
          <span style={{ font: '400 11.5px "JetBrains Mono"', color: 'var(--text-tertiary)' }}>
            ≈ {fmtTRY(tryEquivalent)}
          </span>
        ) : (
          <span style={{ font: '500 11px "Inter Tight"', color: 'var(--color-danger)' }}>
            Kur eksik
          </span>
        )
      ) : (
        <span style={{ font: '400 11.5px "JetBrains Mono"', color: 'var(--text-tertiary)' }}>
          TRY
        </span>
      )}
    </div>
  );
};

function FooterStat({ label, value, size = 13, color = 'var(--text-primary)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
      <span style={{ font: '600 11px "Inter Tight"', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      <span style={{ font: `500 ${size}px "JetBrains Mono"`, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function SummaryFooter({ summary }) {
  return (
    <Table.Summary fixed>
      <Table.Summary.Row style={{ background: 'var(--surface-sunken)' }}>
        <Table.Summary.Cell index={0} colSpan={9}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ font: '400 12px "Inter Tight"', color: 'var(--text-secondary)', flex: '1 1 auto', minWidth: 0 }}>
              Filtreli toplam · <strong style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {summary.count} fatura · {summary.period}
              </strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0 }}>
              <FooterStat label="Ara Toplam" value={fmtTRY(summary.subtotal)} />
              <FooterStat label="KDV" value={fmtTRY(summary.kdv)} />
              <FooterStat label="Toplam" value={fmtTRY(summary.total)} size={15} />
              <FooterStat
                label="Net"
                value={(summary.net >= 0 ? '+ ' : '− ') + fmtTRY(Math.abs(summary.net))}
                color={summary.net >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
              />
            </div>
          </div>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );
}

export function InvoiceTableEmpty({ onCreate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 24px', color: 'var(--text-tertiary)' }}>
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="20" y="14" width="56" height="56" rx="4" />
        <path d="M30 28h36M30 38h28M30 48h20" />
        <rect x="70" y="32" width="32" height="40" rx="4" fill="var(--surface-raised)" />
        <path d="M78 44h16M78 52h12M78 60h14" />
      </svg>
      <div style={{ font: '500 14px "Inter Tight"', color: 'var(--text-primary)' }}>Henüz fatura yok</div>
      <div style={{ font: '400 13px "Inter Tight"', color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 320 }}>
        Faturalarınızı tek bir yerde toplamaya başlayın. KDV ve TRY karşılıkları otomatik hesaplanır.
      </div>
      <button onClick={onCreate} className="ant-btn ant-btn-primary" style={{ marginTop: 6 }}>+ Yeni Fatura Ekle</button>
    </div>
  );
}

function LineItemsExpansion({ invoice }) {
  const lines = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const tryLines = Array.isArray(invoice.try_equivalent?.line_items)
    ? invoice.try_equivalent.line_items
    : null;
  const dataSource = lines.map((li, idx) => {
    const tryLi = tryLines?.find((t) => t.id === li.id) || tryLines?.[idx] || null;
    const subtotal = Number(li.subtotal) || 0;
    const rate = Number(li.vat_rate) || 0;
    const vatAmount = subtotal * (rate / 100);
    return {
      key: li.id ?? idx,
      description: li.description || '—',
      subtotal,
      vat_rate: rate,
      vat_amount: vatAmount,
      line_total: subtotal + vatAmount,
      try_subtotal: tryLi?.subtotal ?? null,
      try_vat_amount: tryLi?.vat_amount ?? null,
    };
  });
  const isForeign = invoice.currency !== 'TRY';
  const columns = [
    { title: 'Açıklama', dataIndex: 'description', key: 'description' },
    {
      title: 'Ara Toplam',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right',
      width: 160,
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ font: '500 12.5px "JetBrains Mono"', fontVariantNumeric: 'tabular-nums' }}>
            {fmtCur(v, invoice.currency)}
          </span>
          {isForeign && row.try_subtotal != null && (
            <span style={{ font: '400 11px "JetBrains Mono"', color: 'var(--text-tertiary)' }}>
              ≈ {fmtTRY(row.try_subtotal)}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'KDV %',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      align: 'right',
      width: 80,
      render: (v) => `%${v}`,
    },
    {
      title: 'KDV Tutarı',
      dataIndex: 'vat_amount',
      key: 'vat_amount',
      align: 'right',
      width: 160,
      render: (v, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ font: '500 12.5px "JetBrains Mono"', fontVariantNumeric: 'tabular-nums' }}>
            {fmtCur(v, invoice.currency)}
          </span>
          {isForeign && row.try_vat_amount != null && (
            <span style={{ font: '400 11px "JetBrains Mono"', color: 'var(--text-tertiary)' }}>
              ≈ {fmtTRY(row.try_vat_amount)}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Satır Toplamı',
      dataIndex: 'line_total',
      key: 'line_total',
      align: 'right',
      width: 160,
      render: (v) => (
        <span style={{ font: '500 13px "JetBrains Mono"', fontVariantNumeric: 'tabular-nums' }}>
          {fmtCur(v, invoice.currency)}
        </span>
      ),
    },
  ];
  return (
    <div style={{ padding: '8px 24px 16px' }}>
      <Table
        size="small"
        pagination={false}
        columns={columns}
        dataSource={dataSource}
        rowClassName={() => 'tt-row-nested'}
      />
    </div>
  );
}

export default function InvoiceTable({ rows, selectedRowKeys, onSelectChange, onRowClick, summary }) {
  const columns = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      width: 100,
      align: 'left',
      render: (v) => <DateCell value={v} />,
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Şirket / Açıklama',
      dataIndex: 'company',
      render: (_, row) => (
        <CompanyCell name={row.company} invoiceNo={row.invoice_no} description={row.description} />
      ),
    },
    {
      title: 'Tür',
      dataIndex: 'invoice_type',
      width: 90,
      align: 'center',
      render: (t) => <TypeChip type={t} />,
    },
    {
      title: 'Tutar',
      dataIndex: 'subtotal',
      width: 140,
      align: 'right',
      render: (_, row) => (
        <AmountCell
          amount={row.subtotal}
          currency={row.currency}
          tryEquivalent={row.try_equivalent?.subtotal}
        />
      ),
    },
    {
      title: 'KDV %',
      dataIndex: 'vat_rate',
      width: 100,
      align: 'right',
      sorter: (a, b) => (a.vat_rate ?? -1) - (b.vat_rate ?? -1),
      render: (v, row) => {
        if (v == null) {
          const distinct = Array.isArray(row.line_items)
            ? [...new Set(row.line_items.map((li) => Math.round((Number(li.vat_rate) || 0) * 100) / 100))].sort((a, b) => a - b)
            : [];
          return (
            <Tooltip title={distinct.length ? distinct.map((r) => `%${r}`).join(', ') : 'Karışık KDV oranları'}>
              <Tag color="gold" style={{ margin: 0 }}>Karışık</Tag>
            </Tooltip>
          );
        }
        return (
          <span style={{ font: '500 13px "JetBrains Mono"', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            %{v}
          </span>
        );
      },
    },
    {
      title: 'Toplam',
      dataIndex: 'total',
      width: 140,
      align: 'right',
      render: (_, row) => (
        <AmountCell
          amount={row.total}
          currency={row.currency}
          tryEquivalent={row.try_equivalent?.total}
        />
      ),
      sorter: (a, b) => (a.try_equivalent?.total ?? a.total) - (b.try_equivalent?.total ?? b.total),
    },
    {
      title: '',
      key: 'chev',
      width: 36,
      align: 'center',
      render: () => (
        <RightOutlined className="tt-row-chev" style={{ color: 'var(--text-tertiary)', fontSize: 12, opacity: 0, transition: 'opacity 120ms' }} />
      ),
    },
  ];

  return (
    <div className="tt-invoice-table">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectChange,
          columnWidth: 36,
        }}
        expandable={{
          rowExpandable: (row) => Array.isArray(row.line_items) && row.line_items.length > 0,
          expandedRowRender: (row) => <LineItemsExpansion invoice={row} />,
        }}
        onRow={(row) => ({
          onClick: () => onRowClick?.(row),
          onMouseEnter: (e) => {
            const c = e.currentTarget.querySelector('.tt-row-chev');
            if (c) c.style.opacity = '1';
          },
          onMouseLeave: (e) => {
            const c = e.currentTarget.querySelector('.tt-row-chev');
            if (c) c.style.opacity = '0';
          },
          style: { cursor: 'pointer' },
        })}
        rowClassName={() => 'tt-row'}
        summary={() => summary && <SummaryFooter summary={summary} />}
        showSorterTooltip={false}
        sticky
      />
    </div>
  );
}
