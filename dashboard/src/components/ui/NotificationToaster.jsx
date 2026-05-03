import { useUIStore } from '../../store/uiStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error:   <AlertCircle size={16} className="text-red-400" />,
  info:    <Info size={16} className="text-blue-400" />,
  warning: <AlertCircle size={16} className="text-amber-400" />,
};
const colors = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error:   'border-red-500/30 bg-red-500/10',
  info:    'border-blue-500/30 bg-blue-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
};

export default function NotificationToaster() {
  const { notifications, removeNotification } = useUIStore();
  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className={cn(
          'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl animate-slide-up backdrop-blur-sm',
          colors[n.type] || colors.info
        )}>
          <div className="flex-shrink-0 mt-0.5">{icons[n.type] || icons.info}</div>
          <div className="flex-1 min-w-0">
            {n.title && <div className="text-sm font-semibold text-white">{n.title}</div>}
            <div className="text-xs text-slate-300">{n.message}</div>
          </div>
          <button onClick={() => removeNotification(n.id)} className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
