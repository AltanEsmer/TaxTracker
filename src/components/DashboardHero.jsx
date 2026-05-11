// DashboardHero — hero KPI card with sparkline + styled VAT bar chart
import React, { useMemo, useEffect, useState } from 'react';
import { ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import dayjs from 'dayjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function useCountUp(target, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setV(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function HeroKpi({
  label = 'Bu Ay · KDV Toplamı',
  value = 0,
  prevValue = 0,
  spark = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  dueDate = dayjs().date(26),
  period = dayjs().format('MMMM YYYY'),
}) {
  const animated = useCountUp(value);
  const delta = value - prevValue;
  const pct = prevValue !== 0 ? (delta / prevValue) * 100 : 0;
  const up = delta >= 0;
  const daysLeft = dueDate.diff(dayjs(), 'day');

  const path = useMemo(() => {
    const w = 600, h = 200;
    const max = Math.max(...spark);
    const min = Math.min(...spark);
    const pts = spark.map((val, i) => {
      const x = (i / (spark.length - 1)) * w;
      const y = h - 20 - ((val - min) / (max - min || 1)) * (h - 60);
      return [x, y];
    });
    const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
    const fill = d + ` L${w},${h} L0,${h} Z`;
    return { stroke: d, fill, last: pts[pts.length - 1] };
  }, [spark]);

  return (
    <div className="hero-kpi">
      <div style={{ position: 'absolute', top: 28, right: 32, display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
          ● Canlı
        </span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{period}</span>
      </div>

      <p className="label">{label}</p>

      <div className="row">
        <div className="num">
          <span className="currency">₺</span>
          {Math.floor(animated).toLocaleString('tr-TR')}
          <span style={{ opacity: 0.55 }}>,{String(Math.floor((animated % 1) * 100)).padStart(2, '0')}</span>
        </div>
        <span className={'delta ' + (up ? 'up' : 'down')}>
          {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {(up ? '+' : '') + pct.toFixed(1).replace('.', ',')}% · ₺{Math.abs(delta).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="meta">geçen aya göre · son güncelleme {dayjs().format('DD/MM/YYYY HH:mm')}</div>

      <svg style={{ position: 'absolute', right: 0, bottom: 0, width: '60%', height: '70%', opacity: 0.55, pointerEvents: 'none' }} viewBox="0 0 600 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkF" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path.fill} fill="url(#sparkF)" />
        <path d={path.stroke} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={path.last[0]} cy={path.last[1]} r="4" fill="#fff" />
      </svg>

      <div style={{ marginTop: 22, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' }}>
        <ClockCircleOutlined style={{ width: 16, height: 16, opacity: 0.7 }} />
        <span>
          <strong style={{ fontWeight: 600, color: '#fff' }}>{dueDate.format('DD/MM/YYYY')}</strong> tarihinde KDV beyannamesi son tarihi ·{' '}
          <span style={{ opacity: 0.6 }}>{daysLeft} gün kaldı</span>
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Hatırlat →</span>
      </div>
    </div>
  );
}

export const vatBarOptions = (isDark = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutCubic' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1f2c',
      titleColor: '#a8b0bf',
      titleFont: { family: '"Inter Tight", sans-serif', size: 10, weight: '600' },
      bodyColor: '#ffffff',
      bodyFont: { family: '"JetBrains Mono", monospace', size: 13, weight: '500' },
      bodySpacing: 4,
      padding: { top: 10, right: 14, bottom: 10, left: 14 },
      cornerRadius: 8,
      displayColors: false,
      borderColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      callbacks: {
        title: (items) => (items[0]?.label || '').toUpperCase() + ' · ' + dayjs().format('YYYY'),
        label: (ctx) => '₺' + ctx.parsed.y.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false, drawBorder: false },
      ticks: {
        color: '#7c8597',
        font: { family: '"Inter Tight", sans-serif', size: 11, weight: '500' },
      },
      border: { display: false },
    },
    y: {
      grid: {
        color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(20,26,40,0.06)',
        drawBorder: false,
        lineWidth: 1,
      },
      ticks: {
        color: '#7c8597',
        font: { family: '"JetBrains Mono", monospace', size: 10 },
        callback: (v) => (v >= 1000 ? v / 1000 + 'k' : v),
        maxTicksLimit: 5,
        padding: 8,
      },
      border: { display: false },
    },
  },
});

export function VatBarChart({ labels, values, currentIdx, isDark }) {
  const colors = values.map((_, i) =>
    i === currentIdx ? (isDark ? '#8a9bff' : '#1832b8') : (isDark ? '#5c6eff' : '#1f3fe5')
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'KDV',
        data: values,
        backgroundColor: colors,
        borderRadius: 3,
        borderSkipped: false,
        barThickness: 20,
        maxBarThickness: 22,
      },
    ],
  };

  return (
    <div style={{ height: 220 }}>
      <Bar options={vatBarOptions(isDark)} data={data} />
    </div>
  );
}
