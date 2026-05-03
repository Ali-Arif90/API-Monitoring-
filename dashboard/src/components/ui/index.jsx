import { X, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={cn('animate-spin text-teal-400', className)} />;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
export function Skeleton({ className }) {
  return <div className={cn('bg-slate-800 rounded-xl animate-pulse', className)} />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = '#0E7C7B', delta, loading }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '22' }}>
            <Icon size={16} style={{ color }} />
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 mt-2" />
      ) : (
        <div className="text-2xl font-bold text-white mt-1">{value}</div>
      )}
      <div className="flex items-center gap-2 mt-0.5">
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
        {delta !== undefined && (
          <span className={cn('text-xs font-medium', delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {/* Glow accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-50" style={{ background: color }} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-500" />
        </div>
      )}
      <div className="text-base font-semibold text-slate-300">{title}</div>
      {body && <div className="text-sm text-slate-500 mt-1 max-w-xs">{body}</div>}
    </div>
  );
}

// ── Alert banner ──────────────────────────────────────────────────────────────
export function AlertBanner({ type = 'info', children }) {
  const map = {
    success: { bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle,   text: 'text-emerald-400' },
    error:   { bg: 'bg-red-500/10 border-red-500/30',         icon: AlertCircle,   text: 'text-red-400' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/30',     icon: AlertTriangle, text: 'text-amber-400' },
    info:    { bg: 'bg-blue-500/10 border-blue-500/30',       icon: Info,          text: 'text-blue-400' },
  };
  const { bg, icon: Icon, text } = map[type] || map.info;
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-2xl border', bg)}>
      <Icon size={16} className={cn('flex-shrink-0 mt-0.5', text)} />
      <div className={cn('text-sm', text)}>{children}</div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {headers.map((h, i) => (
              <th key={i} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <tr key={i} className="border-b border-slate-800/50">
                {headers.map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                ))}
              </tr>
            ))
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = '#0E7C7B', className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full bg-slate-800 rounded-full h-1.5 overflow-hidden', className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="section-title mb-0">{title}</h2>
      {action}
    </div>
  );
}
