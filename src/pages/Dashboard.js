// Dashboard — Quiet Premium redesign (Slice 1)
import { useContext, useEffect, useState, useMemo } from 'react';
import { Spin, Alert, Button } from 'antd';
import { DownloadOutlined, PlusOutlined, CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { HeroKpi, VatBarChart } from '../components/DashboardHero';
import { TopBarContext } from '../App';

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function currencySymbol(cur) {
  if (cur === 'USD') return '$';
  if (cur === 'EUR') return '€';
  return '₺';
}

function getTryTotal(inv) {
  if (inv.try_equivalent && inv.try_equivalent.total) return Number(inv.try_equivalent.total);
  if (inv.currency === 'TRY') return Number(inv.total || 0);
  return 0;
}

function getTryVat(inv) {
  if (inv.try_equivalent && inv.try_equivalent.vat_amount) return Number(inv.try_equivalent.vat_amount);
  if (inv.currency === 'TRY') return Number(inv.vat_amount || 0);
  return 0;
}

function buildLast12MonthsBuckets(rawInvoices) {
  const now = dayjs();
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const m = now.subtract(11 - i, 'month');
    return { year: m.year(), month: m.month() + 1, label: MONTH_LABELS[m.month()], vat: 0, purchases: 0, sales: 0 };
  });

  rawInvoices.forEach((inv) => {
    const d = dayjs(inv.date);
    const idx = buckets.findIndex((b) => b.year === d.year() && b.month === d.month() + 1);
    if (idx === -1) return;
    const vat = getTryVat(inv);
    const total = getTryTotal(inv);
    buckets[idx].vat += vat;
    if (inv.invoice_type === 'Alış') buckets[idx].purchases += total;
    else buckets[idx].sales += total;
  });

  return buckets;
}

function buildSpark8(buckets, field) {
  const last8 = buckets.slice(-8);
  return last8.map((b) => b[field]);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { setRight } = useContext(TopBarContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawInvoices, setRawInvoices] = useState([]);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  useEffect(() => {
    setRight(
      <>
        <span className="pill-filter"><CalendarOutlined />{dayjs().format('MMMM YYYY')}</span>
        <Button icon={<DownloadOutlined />}>Excel'e Aktar</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>Yeni Fatura</Button>
      </>
    );
    return () => setRight(null);
  }, [setRight, navigate]);

  useEffect(() => {
    if (!window.api) {
      setError('Uygulama başlatılamadı: window.api bulunamadı.');
      setLoading(false);
      return;
    }
    const filters = {
      startDate: dayjs().subtract(11, 'month').startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    };
    window.api.getDashboardData(filters)
      .then((data) => {
        const invoices = (data && data.rawInvoices) ? data.rawInvoices : [];
        setRawInvoices(invoices);
        setError(null);
      })
      .catch((err) => {
        setError('Veri yüklenirken bir hata oluştu: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const buckets = useMemo(() => buildLast12MonthsBuckets(rawInvoices), [rawInvoices]);

  const currentMonth = dayjs().month() + 1;
  const currentYear = dayjs().year();
  const prevMonthD = dayjs().subtract(1, 'month');

  const currentBucket = buckets.find((b) => b.year === currentYear && b.month === currentMonth) || { vat: 0, purchases: 0, sales: 0 };
  const prevBucket = buckets.find((b) => b.year === prevMonthD.year() && b.month === prevMonthD.month() + 1) || { vat: 0, purchases: 0, sales: 0 };

  const vatSpark = buckets.map((b) => b.vat);
  const purchaseSpark8 = buildSpark8(buckets, 'purchases');
  const salesSpark8 = buildSpark8(buckets, 'sales');
  const profitSpark8 = salesSpark8.map((s, i) => s - purchaseSpark8[i]);

  const totalInvoices = rawInvoices.length;
  const prevMonthInvoices = rawInvoices.filter((inv) => {
    const d = dayjs(inv.date);
    return d.year() === prevMonthD.year() && d.month() + 1 === prevMonthD.month() + 1;
  }).length;
  const currentMonthInvoices = rawInvoices.filter((inv) => {
    const d = dayjs(inv.date);
    return d.year() === currentYear && d.month() + 1 === currentMonth;
  }).length;

  const invoicesDelta = currentMonthInvoices - prevMonthInvoices;

  const purchasesTotal = rawInvoices
    .filter((inv) => inv.invoice_type === 'Alış')
    .reduce((s, inv) => s + getTryTotal(inv), 0);
  const salesTotal = rawInvoices
    .filter((inv) => inv.invoice_type === 'Satış')
    .reduce((s, inv) => s + getTryTotal(inv), 0);
  const profitLoss = salesTotal - purchasesTotal;
  const profitUp = profitLoss >= 0;

  const topCompanies = useMemo(() => {
    const map = {};
    rawInvoices.forEach((inv) => {
      if (!map[inv.company]) map[inv.company] = 0;
      map[inv.company] += getTryTotal(inv);
    });
    const sorted = Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const max = sorted[0]?.total || 1;
    return sorted.map((c) => ({ ...c, pct: Math.round((c.total / max) * 100) }));
  }, [rawInvoices]);

  const recentInvoices = useMemo(() =>
    [...rawInvoices].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [rawInvoices]
  );

  const currencyTotals = useMemo(() => {
    const map = { TRY: 0, USD: 0, EUR: 0 };
    rawInvoices.forEach((inv) => {
      const cur = inv.currency || 'TRY';
      if (cur === 'TRY') map.TRY += getTryTotal(inv);
      else if (cur === 'USD') map.USD += getTryTotal(inv);
      else if (cur === 'EUR') map.EUR += getTryTotal(inv);
    });
    return map;
  }, [rawInvoices]);

  const circ = 2 * Math.PI * 40;
  const totalCur = currencyTotals.TRY + currencyTotals.USD + currencyTotals.EUR || 1;
  const tryPct = currencyTotals.TRY / totalCur;
  const eurPct = currencyTotals.EUR / totalCur;
  const usdPct = currencyTotals.USD / totalCur;
  const tryDash = tryPct * circ;
  const eurDash = eurPct * circ;
  const usdDash = usdPct * circ;
  const tryOffset = 0;
  const eurOffset = -(tryDash);
  const usdOffset = -(tryDash + eurDash);

  const largestCur = tryPct >= eurPct && tryPct >= usdPct ? { label: 'TRY', pct: tryPct } :
    eurPct >= usdPct ? { label: 'EUR', pct: eurPct } : { label: 'USD', pct: usdPct };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Hata" description={error} type="error" showIcon />;
  }

  return (
    <div className="tt-page">
      <HeroKpi
        value={currentBucket.vat}
        prevValue={prevBucket.vat}
        spark={vatSpark}
        dueDate={dayjs().date(26)}
        period={dayjs().format('MMMM YYYY')}
      />

      <div className="kpi-row">
        <div className="kpi">
          <p className="label caps">Toplam Fatura</p>
          <div className="num">{totalInvoices}</div>
          <div className="row">
            <span className={'delta ' + (invoicesDelta >= 0 ? 'up' : 'down')}>
              {invoicesDelta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {invoicesDelta >= 0 ? '+' : ''}{invoicesDelta} bu ay
            </span>
            <svg className="mini-spark" viewBox="0 0 64 22" preserveAspectRatio="none">
              <polyline
                points={buildSpark8(buckets, 'vat').map((v, i) => {
                  const max = Math.max(...buildSpark8(buckets, 'vat')) || 1;
                  return `${i * 64 / 7},${22 - (v / max) * 18}`;
                }).join(' ')}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="kpi">
          <p className="label caps">Alış Toplamı</p>
          <div className="num"><span className="cur">₺</span>{purchasesTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="row">
            <span className={'delta ' + (currentBucket.purchases >= prevBucket.purchases ? 'up' : 'down')}>
              {currentBucket.purchases >= prevBucket.purchases ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              bu ay ₺{currentBucket.purchases.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </span>
            <svg className="mini-spark" viewBox="0 0 64 22" preserveAspectRatio="none">
              <polyline
                points={purchaseSpark8.map((v, i) => {
                  const max = Math.max(...purchaseSpark8) || 1;
                  return `${i * 64 / 7},${22 - (v / max) * 18}`;
                }).join(' ')}
                fill="none"
                stroke="var(--chart-3)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="kpi">
          <p className="label caps">Satış Toplamı</p>
          <div className="num"><span className="cur">₺</span>{salesTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="row">
            <span className={'delta ' + (currentBucket.sales >= prevBucket.sales ? 'up' : 'down')}>
              {currentBucket.sales >= prevBucket.sales ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              bu ay ₺{currentBucket.sales.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </span>
            <svg className="mini-spark" viewBox="0 0 64 22" preserveAspectRatio="none">
              <polyline
                points={salesSpark8.map((v, i) => {
                  const max = Math.max(...salesSpark8) || 1;
                  return `${i * 64 / 7},${22 - (v / max) * 18}`;
                }).join(' ')}
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="kpi">
          <p className="label caps">Kar / Zarar</p>
          <div className="num" style={{ color: profitUp ? 'var(--color-success)' : 'var(--color-danger)' }}>
            <span className="cur">₺</span>{Math.abs(profitLoss).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="row">
            <span className={'delta ' + (profitUp ? 'up' : 'down')}>
              {profitUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {profitUp ? 'Kâr' : 'Zarar'}
            </span>
            <svg className="mini-spark" viewBox="0 0 64 22" preserveAspectRatio="none">
              <polyline
                points={profitSpark8.map((v, i) => {
                  const max = Math.max(...profitSpark8.map(Math.abs)) || 1;
                  return `${i * 64 / 7},${22 - ((v + max) / (2 * max)) * 18}`;
                }).join(' ')}
                fill="none"
                stroke={profitUp ? 'var(--chart-3)' : 'var(--color-danger)'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <div className="chart-head">
            <h3>KDV — son 12 ay</h3>
            <div className="legend">
              <span className="legend-dot">KDV</span>
            </div>
          </div>
          <VatBarChart
            isDark={isDark}
            currentIdx={11}
            labels={buckets.map((b) => b.label)}
            values={buckets.map((b) => b.vat)}
          />
        </div>

        <div className="card chart-card">
          <div className="chart-head"><h3>Para Birimi Dağılımı</h3></div>
          <div className="donut-wrap">
            <div className="donut">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-sunken)" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cc-try)" strokeWidth="12"
                  strokeDasharray={`${tryDash} ${circ}`}
                  strokeDashoffset={tryOffset}
                  strokeLinecap="butt"
                  transform="rotate(-90 50 50)"
                />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cc-eur)" strokeWidth="12"
                  strokeDasharray={`${eurDash} ${circ}`}
                  strokeDashoffset={eurOffset}
                  strokeLinecap="butt"
                  transform="rotate(-90 50 50)"
                />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cc-usd)" strokeWidth="12"
                  strokeDasharray={`${usdDash} ${circ}`}
                  strokeDashoffset={usdOffset}
                  strokeLinecap="butt"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="center">
                <span className="v">{Math.round(largestCur.pct * 100)}%</span>
                <span className="l">{largestCur.label}</span>
              </div>
            </div>
            <div className="donut-legend">
              <div className="dl-row">
                <div className="left">TRY</div>
                <div className="v">₺{currencyTotals.TRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="dl-row s2">
                <div className="left">EUR</div>
                <div className="v">€{currencyTotals.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="dl-row s3">
                <div className="left">USD</div>
                <div className="v">${currencyTotals.USD.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="companies-row">
        <div className="card company-list">
          <div className="chart-head">
            <h3>En Çok İşlem · Şirketler</h3>
            <span className="caps">Top 5</span>
          </div>
          {topCompanies.map((c) => {
            const initials = c.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
            return (
              <div className="company-row" key={c.name}>
                <div className="avatar">{initials}</div>
                <div className="meta">
                  <span className="name">{c.name}</span>
                  <div className="bar"><i style={{ width: `${c.pct}%` }} /></div>
                </div>
                <span className="num">₺{c.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
          {topCompanies.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>Veri yok</div>
          )}
        </div>

        <div className="card recent-list">
          <div className="chart-head">
            <h3>Son Faturalar</h3>
            <a className="btn-link" onClick={() => navigate('/invoices')} style={{ cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Tümünü gör →</a>
          </div>
          {recentInvoices.map((inv) => (
            <div className="recent-row" key={inv.id}>
              <span className={inv.invoice_type === 'Alış' ? 'dot warm' : 'dot'} />
              <div className="stack">
                <span className="name">{inv.company}</span>
                <span className="sub">{inv.invoice_no} · {dayjs(inv.date).format('DD/MM/YYYY')} · {inv.invoice_type}</span>
              </div>
              <span className={inv.invoice_type === 'Alış' ? 'chip chip-cool chip-dot' : 'chip chip-warm chip-dot'}>{inv.invoice_type}</span>
              <span className="amt">{currencySymbol(inv.currency)}{Number(inv.total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          {recentInvoices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>Fatura bulunamadı</div>
          )}
        </div>
      </div>
    </div>
  );
}
