import { useState } from 'react';
import { Menu, Bell, RefreshCw, Search } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useAlerts } from '../../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import { fmtRelative } from '../../lib/utils';

export default function Topbar({ title, subtitle }) {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showAlerts, setShowAlerts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data: alertsData } = useAlerts('?limit=10');
  const alerts = alertsData?.data || [];
  const unread = alerts.filter(a => !a.acknowledged_at).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors lg:hidden">
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleRefresh} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {/* Alerts bell */}
        <div className="relative">
          <button onClick={() => setShowAlerts(v => !v)} className="relative p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-950" />
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white">Recent Alerts</span>
                {unread > 0 && <span className="badge-red">{unread} new</span>}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">No alerts</div>
                ) : alerts.map(a => (
                  <div key={a.id} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        a.severity === 'critical' ? 'bg-red-400' :
                        a.severity === 'warning'  ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-200 truncate">{a.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{fmtRelative(a.created_at)}</div>
                      </div>
                      {!a.acknowledged_at && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1 flex-shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-800">
                <a href="/alerts" className="text-xs text-teal-400 hover:text-teal-300 font-medium">View all alerts →</a>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy-DEFAULT to-teal-DEFAULT flex items-center justify-center text-xs font-bold text-white flex-shrink-0 cursor-pointer">
          {(user?.name || user?.email || 'U')[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
