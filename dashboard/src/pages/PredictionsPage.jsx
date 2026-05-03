import { useState } from 'react';
import { Brain, RefreshCw, TrendingDown, TrendingUp, Minus, AlertTriangle, Zap, Clock } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { StatCard, SectionHeader, EmptyState, AlertBanner, Skeleton } from '../components/ui/index';
import { TrafficChart, LatencyChart, ProbGauge } from '../components/charts/index';
import { useAnomalies, useDowntimePredictions, useTrafficForecast, usePerformanceData } from '../hooks/useApi';
import { predApi } from '../lib/api';
import { useUIStore } from '../store/uiStore';
import { fmtMs, fmtRelative, fmtPct, severityBg, trendColor, riskColor } from '../lib/utils';

function buildForecastChart(rows = []) {
  if (!rows.length) return [];
  const first = rows[0];
  const meta = first?.metadata;
  if (!meta?.forecast) return [];
  return meta.forecast.slice(0, 24).map((v, i) => ({
    label: `+${i + 1}h`,
    forecast: parseFloat(v.toFixed(1)),
    lower: parseFloat((meta.lower?.[i] ?? v * 0.8).toFixed(1)),
    upper: parseFloat((meta.upper?.[i] ?? v * 1.2).toFixed(1)),
  }));
}

function buildLatencyChart(rows = []) {
  return rows.slice(-24).map((r, i) => ({
    label: `${i + 1}h`,
    avg: parseFloat(parseFloat(r.metadata?.currentLatency ?? r.predicted_value ?? 0).toFixed(1)),
    p95: parseFloat(parseFloat(r.metadata?.p95Latency ?? 0).toFixed(1)),
    max: parseFloat(parseFloat(r.metadata?.maxLatency ?? 0).toFixed(1)),
  }));
}

export default function PredictionsPage() {
  const notify = useUIStore(s => s.addNotification);
  const [running, setRunning] = useState(false);

  const { data: anomalyData,   isLoading: aLoading }  = useAnomalies(24);
  const { data: downtimeData,  isLoading: dLoading }  = useDowntimePredictions();
  const { data: trafficData,   isLoading: tLoading }  = useTrafficForecast();
  const { data: perfData,      isLoading: pLoading }  = usePerformanceData();

  const anomalies = anomalyData?.data  || [];
  const downtime  = downtimeData?.data || [];
  const forecasts = trafficData?.data  || [];
  const perf      = perfData?.data     || [];

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount  = anomalies.filter(a => a.severity === 'warning').length;
  const highRisk      = downtime.filter(d => parseFloat(d.predicted_value) >= 0.7).length;

  const trafficChart  = buildForecastChart(forecasts);
  const latencyChart  = buildLatencyChart(perf);

  const runCycle = async () => {
    setRunning(true);
    try {
      await predApi.runCycle();
      notify({ type: 'success', title: 'Prediction cycle triggered', message: 'Results will update in ~30 seconds' });
    } catch (e) {
      notify({ type: 'error', message: e.message });
    } finally {
      setRunning(false);
    }
  };

  const topPerf = perf[0]?.metadata || {};

  return (
    <AppShell title="AI Predictions" subtitle="Machine-learning powered forecasts and anomaly detection">

      {/* Risk banner */}
      {(criticalCount > 0 || highRisk > 0) && (
        <div className="mb-5">
          <AlertBanner type="error">
            <strong>{criticalCount} critical anomal{criticalCount === 1 ? 'y' : 'ies'}</strong>
            {highRisk > 0 && <span> · <strong>{highRisk} endpoint{highRisk > 1 ? 's' : ''}</strong> at high downtime risk</span>}
            {' '}— review predictions below and acknowledge alerts.
          </AlertBanner>
        </div>
      )}
      {criticalCount === 0 && warningCount === 0 && (
        <div className="mb-5">
          <AlertBanner type="success">
            All systems nominal — no critical anomalies detected in the last 24 hours.
          </AlertBanner>
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Anomalies"   value={anomalies.length}  icon={Zap}          color="#ef4444" />
        <StatCard label="Critical Alerts"    value={criticalCount}     icon={AlertTriangle} color="#ef4444" />
        <StatCard label="High-Risk Endpoints" value={highRisk}         icon={TrendingDown}  color="#f97316" />
        <StatCard label="Degrading Latency"  value={perf.filter(p => p.metadata?.isDegrading).length} icon={Clock} color="#f59e0b" />
      </div>

      {/* Downtime probability cards */}
      <div className="card mb-6">
        <SectionHeader title="Downtime Probability by Endpoint" action={
          <button onClick={runCycle} disabled={running} className="btn-secondary text-xs gap-1.5 py-1.5">
            <RefreshCw size={13} className={running ? 'animate-spin' : ''} />
            Run Prediction Cycle
          </button>
        } />
        {dLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : downtime.length === 0 ? (
          <EmptyState icon={Brain} title="No downtime predictions yet"
            body="Predictions appear after the AI engine processes at least 10 hours of metrics data." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {downtime.slice(0, 10).map(d => {
              const meta = d.metadata || {};
              const prob = parseFloat(meta.prob60m ?? d.predicted_value ?? 0);
              return (
                <div key={d.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all">
                  <ProbGauge value={prob} />
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]" title={d.endpoint}>
                      {d.endpoint?.length > 18 ? d.endpoint.slice(0, 18) + '…' : d.endpoint}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{d.service_name}</div>
                    <div className="mt-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full`}
                        style={{ color: riskColor(meta.risk), background: riskColor(meta.risk) + '22' }}>
                        {meta.risk || 'low'} risk
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      15m: {Math.round((meta.prob15m ?? 0) * 100)}% · 60m: {Math.round(prob * 100)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Traffic forecast + Latency trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <SectionHeader title="Traffic Forecast — Next 24h" />
          {tLoading ? <Skeleton className="h-52 w-full" /> :
           trafficChart.length > 0
            ? <TrafficChart data={trafficChart} height={220} />
            : <EmptyState icon={TrendingUp} title="Forecast unavailable"
                body="Requires at least 48h of traffic history to generate forecasts." />
          }
          {forecasts[0]?.confidence_score && (
            <div className="mt-2 text-xs text-slate-500">
              Model confidence: <span className="text-teal-400 font-semibold">
                {Math.round(parseFloat(forecasts[0].confidence_score) * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Latency Trend Analysis" />
          {pLoading ? <Skeleton className="h-52 w-full" /> :
           latencyChart.length > 0
            ? <LatencyChart data={latencyChart} slaLine={500} height={220} />
            : <EmptyState icon={Clock} title="No latency data" body="Latency predictions appear once the AI engine has processed metrics." />
          }
          {topPerf.trend && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-slate-500">Trend:</span>
              <span className={`font-semibold ${trendColor(topPerf.trend)}`}>
                {topPerf.trend?.replace(/_/g, ' ')}
              </span>
              {topPerf.hoursToSLABreach != null && (
                <span className="text-amber-400">
                  · SLA breach in ~{topPerf.hoursToSLABreach}h
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Anomaly list */}
      <div className="card">
        <SectionHeader title="Detected Anomalies (Last 24h)" />
        {aLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : anomalies.length === 0 ? (
          <EmptyState icon={Zap} title="No anomalies detected" body="All metrics within normal statistical range." />
        ) : (
          <div className="space-y-2">
            {anomalies.map(a => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition-all">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  a.severity === 'critical' ? 'bg-red-400 animate-pulse' :
                  a.severity === 'warning'  ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">
                    {a.anomaly_type?.replace(/_/g, ' ')} anomaly
                    <span className="text-slate-500 font-normal"> on </span>
                    {a.service_name}/{a.endpoint}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    z-score: {parseFloat(a.z_score || 0).toFixed(2)}
                    {a.details?.currentValue != null && ` · value: ${parseFloat(a.details.currentValue).toFixed(3)}`}
                    {a.details?.mean != null && ` · mean: ${parseFloat(a.details.mean).toFixed(3)}`}
                    · {fmtRelative(a.detected_at)}
                  </div>
                </div>
                <span className={severityBg(a.severity)}>{a.severity}</span>
                {!a.is_active && <span className="badge-slate">resolved</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
