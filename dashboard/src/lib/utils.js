import { clsx } from 'clsx';

export function cn(...classes) { return clsx(classes); }

export function fmt(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const num = parseFloat(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
  return num.toFixed(decimals);
}

export function fmtMs(ms) {
  if (!ms && ms !== 0) return '—';
  const n = parseFloat(ms);
  if (n >= 1000) return (n / 1000).toFixed(2) + 's';
  return Math.round(n) + 'ms';
}

export function fmtPct(v, decimals = 1) {
  if (v === null || v === undefined) return '—';
  return parseFloat(v).toFixed(decimals) + '%';
}

export function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function severityColor(s) {
  if (s === 'critical') return 'text-red-400';
  if (s === 'warning')  return 'text-amber-400';
  if (s === 'info')     return 'text-blue-400';
  return 'text-slate-400';
}

export function severityBg(s) {
  if (s === 'critical') return 'badge-red';
  if (s === 'warning')  return 'badge-yellow';
  if (s === 'info')     return 'badge-blue';
  return 'badge-slate';
}

export function healthColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function riskColor(risk) {
  const map = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
  return map[risk] || '#94a3b8';
}

export function trendColor(trend) {
  if (trend === 'improving') return 'text-emerald-400';
  if (trend === 'stable')    return 'text-slate-400';
  if (trend === 'degrading') return 'text-amber-400';
  if (trend === 'degrading_fast') return 'text-red-400';
  return 'text-slate-400';
}

export function generateHours(n = 24) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - 1 - i) * 3600000);
    return d.getHours().toString().padStart(2, '0') + ':00';
  });
}

export function mockSeries(length, base, variance) {
  return Array.from({ length }, () => Math.max(0, base + (Math.random() - 0.5) * variance));
}
