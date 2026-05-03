import { Activity, Zap, AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { StatCard, Skeleton, SectionHeader, Table, EmptyState } from '../components/ui/index';
import { TrafficChart, HealthGauge } from '../components/charts/index';
import { useHealthScore, useMetricsSummary, useHourlyTraffic, useAlerts, useAnomalies } from '../hooks/useApi';
import { fmt, fmtMs, fmtPct, fmtRelative, severityBg } from '../lib/utils';

function buildTrafficSeries(rows = []) {
  return rows.slice(-24).map(r => ({
    label: new Date(r.time_bucket).getHours().toString().padStart(2, '0') + ':00',
    hits: parseInt(r.total_hits) || 0,
  }));
}

export default function DashboardPage() {
  const { data: healthData, isLoading: hLoading } = useHealthScore();
  const { data: summaryData, isLoading: sLoading } = useMetricsSummary(24);
  const { data: trafficData } = useHourlyTraffic(48);
  const { data: alertsData } = useAlerts('?limit=8');
  const { data: anomalyData } = useAnomalies(24);

  const health   = healthData?.data || {};
  const summary  = summaryData?.data || {};
  const traffic  = trafficData?.data || [];
  const alerts   = alertsData?.data  || [];
  const anomalies = anomalyData?.data || [];

  const totalReqs   = parseInt(summary.total_requests) || 0;
  const totalErrors = parseInt(summary.total_errors) || 0;
  const errorRate   = totalReqs > 0 ? (totalErrors / totalReqs) * 100 : 0;
  const avgLatency  = parseFloat(summary.avg_latency) || 0;
  const chartData   = buildTrafficSeries(traffic);

  return (
    <AppShell title="Overview" subtitle="Real-time API health and activity">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Requests (24h)" value={fmt(totalReqs, 0)} icon={Activity}
          color="#0E7C7B" sub="last 24 hours" loading={sLoading} />
        <StatCard label="Error Rate" value={fmtPct(errorRate)}
          icon={AlertTriangle} color={errorRate > 5 ? '#ef4444' : '#f59e0b'}
          sub={`${fmt(totalErrors, 0)} errors`} loading={sLoading} />
        <StatCard label="Avg Latency" value={fmtMs(avgLatency)}
          icon={Clock} color={avgLatency > 500 ? '#f97316' : '#2D9CDB'}
          sub="mean response time" loading={sLoading} />
        <StatCard label="Health Score" value={hLoading ? '…' : `${health.score ?? '—'}`}
          icon={CheckCircle} color={health.score >= 80 ? '#10b981' : health.score >= 60 ? '#f59e0b' : '#ef4444'}
          sub="overall system health" />
      </div>

      {/* Traffic chart + Health gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 card">
          <SectionHeader title="Request Traffic — Last 48h" />
          {chartData.length > 0
            ? <TrafficChart data={chartData} height={220} />
            : <Skeleton className="h-52 w-full" />}
        </div>

        <div className="card flex flex-col items-center justify-center gap-4">
          <div className="text-sm font-semibold text-slate-300">System Health</div>
          {hLoading ? <Skeleton className="w-28 h-28 rounded-full" /> : <HealthGauge score={health.score ?? 0} size={130} />}
          <div className="w-full space-y-2 text-xs">
            {[
              { label: 'Active Anomalies', val: health.activeAnomalies ?? 0, bad: v => v > 0 },
              { label: 'Unacked Alerts',   val: health.unacknowledgedAlerts ?? 0, bad: v => v > 0 },
              { label: 'Error Rate',        val: fmtPct(health.errorRate), bad: () => false },
              { label: 'Avg Latency',       val: fmtMs(health.avgLatency), bad: () => false },
            ].map(({ label, val, bad }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className={bad(val) ? 'text-red-400 font-semibold' : 'text-slate-300 font-medium'}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <SectionHeader title="Recent Alerts" action={
            <a href="/alerts" className="text-xs text-teal-400 hover:text-teal-300 font-medium">View all →</a>
          } />
          {alerts.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No recent alerts" body="All systems nominal" />
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    a.severity === 'critical' ? 'bg-red-400' :
                    a.severity === 'warning'  ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{a.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{fmtRelative(a.created_at)}</div>
                  </div>
                  <span className={severityBg(a.severity)}>{a.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Active Anomalies" action={
            <a href="/predictions" className="text-xs text-teal-400 hover:text-teal-300 font-medium">Predictions →</a>
          } />
          {anomalies.length === 0 ? (
            <EmptyState icon={Zap} title="No active anomalies" body="All metrics within normal range" />
          ) : (
            <div className="space-y-2">
              {anomalies.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    a.severity === 'critical' ? 'bg-red-400 animate-pulse' :
                    a.severity === 'warning'  ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200">
                      {a.anomaly_type?.replace(/_/g, ' ')} — {a.service_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{a.endpoint} · z-score: {parseFloat(a.z_score || 0).toFixed(2)}</div>
                  </div>
                  <span className={severityBg(a.severity)}>{a.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
