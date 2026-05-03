import { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, AlertTriangle, Info, Filter } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { StatCard, SectionHeader, EmptyState, Skeleton, Modal } from '../components/ui/index';
import { useAlerts, useAlertStats, useAckAlert } from '../hooks/useApi';
import { fmtRelative, fmtTime, severityBg, fmt } from '../lib/utils';

const SEVERITY_FILTERS = ['all', 'critical', 'warning', 'info'];

const sevIcon = (s) => {
  if (s === 'critical') return <AlertCircle size={14} className="text-red-400" />;
  if (s === 'warning')  return <AlertTriangle size={14} className="text-amber-400" />;
  return <Info size={14} className="text-blue-400" />;
};

export default function AlertsPage() {
  const [severity, setSeverity] = useState('all');
  const [selected, setSelected] = useState(null);
  const [ackOnly, setAckOnly] = useState(false);

  const queryStr = `?limit=100${severity !== 'all' ? `&severity=${severity}` : ''}`;
  const { data: alertsRaw, isLoading } = useAlerts(queryStr);
  const { data: statsRaw } = useAlertStats(24);
  const ackMutation = useAckAlert();

  const allAlerts = alertsRaw?.data || [];
  const stats = statsRaw?.data || {};

  const alerts = ackOnly
    ? allAlerts.filter(a => a.acknowledged_at)
    : allAlerts;

  const unacked = allAlerts.filter(a => !a.acknowledged_at);

  const handleAck = (id) => {
    ackMutation.mutate(id);
    setSelected(null);
  };

  return (
    <AppShell title="Alerts" subtitle="Alert history, triage, and acknowledgement">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Alerts (24h)"  value={fmt(parseInt(stats.total_alerts)||0, 0)}   icon={Bell}          color="#2D9CDB" />
        <StatCard label="Critical"            value={fmt(parseInt(stats.critical_count)||0, 0)} icon={AlertCircle}   color="#ef4444" />
        <StatCard label="Unacknowledged"      value={unacked.length}                            icon={AlertTriangle} color="#f97316" />
        <StatCard label="Avg Ack Time"
          value={stats.avg_ack_minutes ? `${parseFloat(stats.avg_ack_minutes).toFixed(0)}m` : '—'}
          icon={CheckCircle} color="#10b981" />
      </div>

      {/* Unacked banner */}
      {unacked.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">
              {unacked.length} unacknowledged alert{unacked.length > 1 ? 's' : ''} require attention
            </span>
          </div>
          <button onClick={() => unacked.forEach(a => handleAck(a.id))}
            className="text-xs btn-secondary py-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            Acknowledge All
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1">
          {SEVERITY_FILTERS.map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                severity === s ? 'bg-teal-DEFAULT text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <button onClick={() => setAckOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            ackOnly ? 'bg-teal-500/15 border-teal-500/30 text-teal-400' : 'border-slate-700 text-slate-400 hover:text-slate-200'
          }`}>
          <Filter size={12} /> Acknowledged only
        </button>
      </div>

      {/* Alert list */}
      <div className="card">
        <SectionHeader title={`Alerts ${severity !== 'all' ? `— ${severity}` : ''}`} />
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : alerts.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No alerts found" body="Adjust your filters or wait for the AI engine to detect new anomalies." />
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id}
                className={`flex flex-wrap items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                  ${!a.acknowledged_at
                    ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-900/40 border-slate-800/50 opacity-70 hover:opacity-90'
                  }`}
                onClick={() => setSelected(a)}>
                <div className="flex-shrink-0 mt-0.5">{sevIcon(a.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-100">{a.title}</span>
                    {!a.acknowledged_at && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" title="Unread" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.message}</div>
                  <div className="text-[11px] text-slate-600 mt-1">{fmtTime(a.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={severityBg(a.severity)}>{a.severity}</span>
                  {a.acknowledged_at ? (
                    <span className="badge-green"><CheckCircle size={10} /> acked</span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); handleAck(a.id); }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 border border-teal-500/20 transition-colors font-medium">
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Alert Detail"
        footer={
          selected && !selected.acknowledged_at && (
            <button onClick={() => handleAck(selected.id)} className="btn-primary">
              <CheckCircle size={14} /> Acknowledge Alert
            </button>
          )
        }>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {sevIcon(selected.severity)}
              <span className={severityBg(selected.severity)}>{selected.severity}</span>
              {selected.acknowledged_at && <span className="badge-green"><CheckCircle size={10} /> acknowledged</span>}
            </div>
            <div>
              <div className="label">Title</div>
              <div className="text-sm text-slate-200 font-medium">{selected.title}</div>
            </div>
            <div>
              <div className="label">Message</div>
              <div className="text-sm text-slate-300 bg-slate-800 rounded-xl p-3 font-mono">{selected.message}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="label">Created</div>
                <div className="text-slate-300">{fmtTime(selected.created_at)}</div>
              </div>
              {selected.acknowledged_at && (
                <div>
                  <div className="label">Acknowledged</div>
                  <div className="text-emerald-400">{fmtTime(selected.acknowledged_at)}</div>
                </div>
              )}
              {selected.acknowledged_by && (
                <div>
                  <div className="label">Acknowledged by</div>
                  <div className="text-slate-300">{selected.acknowledged_by}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
