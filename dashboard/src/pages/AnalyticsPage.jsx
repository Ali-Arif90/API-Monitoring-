import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { StatCard, SectionHeader, Skeleton, EmptyState } from '../components/ui/index';
import { TrafficChart, LatencyChart, ErrorRateChart, MultiLineChart } from '../components/charts/index';
import { useHourlyTraffic, useMetricsSummary } from '../hooks/useApi';
import { fmt, fmtMs, fmtPct } from '../lib/utils';

const RANGES = [
  { label: '6h',  hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d',  hours: 168 },
  { label: '30d', hours: 720 },
];

function buildChartData(rows = [], hours = 24) {
  const slice = hours <= 24 ? rows.slice(-hours) : rows.slice(-Math.min(rows.length, hours));
  return slice.map(r => {
    const total = parseInt(r.total_hits) || 0;
    const errors = parseInt(r.error_hits) || 0;
    const d = new Date(r.time_bucket);
    const label = hours <= 48
      ? d.getHours().toString().padStart(2,'0') + ':00'
      : `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}h`;
    return {
      label,
      hits: total,
      errors,
      errorRate: total > 0 ? parseFloat(((errors/total)*100).toFixed(2)) : 0,
      avg: parseFloat(parseFloat(r.avg_latency || 0).toFixed(1)),
      p95: parseFloat(parseFloat((r.avg_latency||0)*1.4).toFixed(1)),
      max: parseFloat(parseFloat(r.max_latency || 0).toFixed(1)),
    };
  });
}

export default function AnalyticsPage() {
  const [rangeIdx, setRangeIdx] = useState(1);
  const range = RANGES[rangeIdx];

  const { data: trafficRaw,  isLoading: tLoading } = useHourlyTraffic(range.hours);
  const { data: summary1h }  = useMetricsSummary(1);
  const { data: summary24h } = useMetricsSummary(24);

  const traffic  = trafficRaw?.data  || [];
  const s1h  = summary1h?.data  || {};
  const s24h = summary24h?.data || {};

  const chartData = useMemo(() => buildChartData(traffic, range.hours), [traffic, range.hours]);

  const totalReqs = parseInt(s24h.total_requests) || 0;
  const totalErrors = parseInt(s24h.total_errors) || 0;
  const errorRate = totalReqs > 0 ? (totalErrors/totalReqs)*100 : 0;
  const avgLatency = parseFloat(s24h.avg_latency) || 0;

  // Throughput: requests in last hour
  const req1h = parseInt(s1h.total_requests) || 0;

  return (
    <AppShell title="Analytics" subtitle="Historical performance data and endpoint metrics">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Requests (24h)"    value={fmt(totalReqs, 0)}     icon={BarChart3}   color="#0E7C7B" />
        <StatCard label="Throughput (1h)"   value={fmt(req1h, 0)}         icon={TrendingUp}  color="#2D9CDB" />
        <StatCard label="Error Rate (24h)"  value={fmtPct(errorRate)}     icon={AlertCircle} color={errorRate > 5 ? '#ef4444' : '#f59e0b'} />
        <StatCard label="Avg Latency (24h)" value={fmtMs(avgLatency)}     icon={Clock}       color={avgLatency > 500 ? '#f97316' : '#10b981'} />
      </div>

      {/* Range picker */}
      <div className="flex items-center gap-1 mb-5 bg-slate-900 border border-slate-800 rounded-2xl p-1 w-fit">
        {RANGES.map((r, i) => (
          <button key={r.label} onClick={() => setRangeIdx(i)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              rangeIdx === i
                ? 'bg-teal-DEFAULT text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Traffic volume */}
      <div className="card mb-4">
        <SectionHeader title={`Request Volume — Last ${range.label}`} />
        {tLoading
          ? <Skeleton className="h-56 w-full" />
          : chartData.length > 0
            ? <TrafficChart data={chartData} height={230} />
            : <EmptyState icon={BarChart3} title="No traffic data" body="Start sending requests to see traffic analytics." />
        }
      </div>

      {/* Latency + Error rate side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <SectionHeader title="Latency Distribution" />
          {tLoading
            ? <Skeleton className="h-52 w-full" />
            : <LatencyChart data={chartData} slaLine={500} height={210} />
          }
        </div>
        <div className="card">
          <SectionHeader title="Error Rate" />
          {tLoading
            ? <Skeleton className="h-52 w-full" />
            : <ErrorRateChart data={chartData} height={210} />
          }
        </div>
      </div>

      {/* Summary table */}
      <div className="card">
        <SectionHeader title="Hourly Breakdown" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Time', 'Requests', 'Errors', 'Error Rate', 'Avg Latency', 'Max Latency'].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No data for this period</td></tr>
              ) : chartData.slice().reverse().slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 font-mono">{r.label}</td>
                  <td className="px-4 py-2.5 text-slate-200 font-medium">{fmt(r.hits, 0)}</td>
                  <td className="px-4 py-2.5 text-slate-300">{fmt(r.errors, 0)}</td>
                  <td className="px-4 py-2.5">
                    <span className={r.errorRate > 5 ? 'text-red-400 font-semibold' : r.errorRate > 1 ? 'text-amber-400' : 'text-emerald-400'}>
                      {fmtPct(r.errorRate)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={r.avg > 500 ? 'text-amber-400' : 'text-slate-300'}>{fmtMs(r.avg)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{fmtMs(r.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
