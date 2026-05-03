import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, RadialBarChart, RadialBar
} from 'recharts';
import { cn } from '../../lib/utils';

const GRID  = { stroke: '#1e293b', strokeDasharray: '3 3' };
const XAXIS = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false };
const YAXIS = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false, width: 40 };

// ── Traffic area chart ────────────────────────────────────────────────────────
export function TrafficChart({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0E7C7B" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0E7C7B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2D9CDB" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2D9CDB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...XAXIS} />
        <YAxis {...YAXIS} />
        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
        <Legend />
        {data?.[0]?.actual !== undefined && (
          <Area type="monotone" dataKey="actual"   stroke="#0E7C7B" fill="url(#trafficGrad)"   strokeWidth={2} dot={false} name="Actual" />
        )}
        {data?.[0]?.forecast !== undefined && (
          <Area type="monotone" dataKey="forecast" stroke="#2D9CDB" fill="url(#forecastGrad)" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Forecast" />
        )}
        {data?.[0]?.hits !== undefined && (
          <Area type="monotone" dataKey="hits" stroke="#0E7C7B" fill="url(#trafficGrad)" strokeWidth={2} dot={false} name="Requests" />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Latency line chart ────────────────────────────────────────────────────────
export function LatencyChart({ data, slaLine, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...XAXIS} />
        <YAxis {...YAXIS} />
        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
        <Legend />
        {slaLine && <ReferenceLine y={slaLine} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `SLA ${slaLine}ms`, fill: '#ef4444', fontSize: 10 }} />}
        <Line type="monotone" dataKey="avg"  stroke="#0E7C7B" strokeWidth={2} dot={false} name="Avg Latency" />
        <Line type="monotone" dataKey="p95"  stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="P95" />
        <Line type="monotone" dataKey="max"  stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="2 2" name="Max" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Error rate bar chart ──────────────────────────────────────────────────────
export function ErrorRateChart({ data, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...XAXIS} />
        <YAxis {...YAXIS} />
        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
        <Bar dataKey="errorRate" fill="#ef4444" fillOpacity={0.8} radius={[4, 4, 0, 0]} name="Error Rate %" maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Multi-line analytics chart ────────────────────────────────────────────────
export function MultiLineChart({ data, lines = [], height = 240 }) {
  const COLORS = ['#0E7C7B', '#2D9CDB', '#f59e0b', '#8b5cf6', '#ef4444'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...XAXIS} />
        <YAxis {...YAXIS} />
        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
        <Legend />
        {lines.map((l, i) => (
          <Line key={l.key} type="monotone" dataKey={l.key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} name={l.name} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Health gauge (Radial bar) ─────────────────────────────────────────────────
export function HealthGauge({ score = 0, size = 120 }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const data = [{ value: score, fill: color }];
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <RadialBarChart width={size} height={size} innerRadius="70%" outerRadius="100%"
        data={data} startAngle={210} endAngle={-30} barSize={10}>
        <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={10} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-500 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ── Probability gauge (simple arc visual) ─────────────────────────────────────
export function ProbGauge({ value = 0, label, color }) {
  const pct = Math.round(value * 100);
  const col = color || (pct >= 70 ? '#ef4444' : pct >= 45 ? '#f97316' : pct >= 25 ? '#f59e0b' : '#10b981');
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={col} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32 * pct / 100} ${2 * Math.PI * 32}`}
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rotate-90">
          <span className="text-sm font-bold" style={{ color: col }}>{pct}%</span>
        </div>
      </div>
      {label && <span className="text-[11px] text-slate-500 text-center leading-tight">{label}</span>}
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
export function Sparkline({ data, color = '#0E7C7B', height = 40 }) {
  const series = data?.map((v, i) => ({ v, i })) || [];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
