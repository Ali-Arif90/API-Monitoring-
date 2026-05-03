import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Brain, BarChart3, Bell, Key, Settings,
  LogOut, ChevronLeft, Activity, Wifi, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useAlerts } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Overview' },
  { to: '/predictions',  icon: Brain,           label: 'AI Predictions' },
  { to: '/analytics',    icon: BarChart3,       label: 'Analytics' },
  { to: '/alerts',       icon: Bell,            label: 'Alerts',   badge: true },
  { to: '/api-keys',     icon: Key,             label: 'API Keys' },
  { to: '/settings',     icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const { data: alertsData } = useAlerts('?limit=100');
  const unread = alertsData?.data?.filter(a => !a.acknowledged_at)?.length || 0;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-full z-30 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16',
        'lg:relative lg:z-auto'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-DEFAULT to-teal-400 flex items-center justify-center flex-shrink-0">
                <Activity size={16} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">API Monitor</div>
                <div className="text-[10px] text-teal-400 font-medium">AI-Powered</div>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-DEFAULT to-teal-400 flex items-center justify-center mx-auto">
              <Activity size={16} className="text-white" />
            </div>
          )}
          {sidebarOpen && (
            <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Live indicator */}
        {sidebarOpen && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 animate-fade-in">
            <span className="dot-green" />
            <span className="text-xs text-emerald-400 font-medium">System Online</span>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              cn(isActive ? 'nav-item-active' : 'nav-item', !sidebarOpen && 'justify-center px-0')
            }>
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="flex-1 animate-fade-in">{label}</span>}
              {sidebarOpen && badge && unread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-fade-in">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              {!sidebarOpen && badge && unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          {sidebarOpen && user && (
            <div className="px-3 py-2 animate-fade-in">
              <div className="text-xs font-semibold text-white truncate">{user.name || user.email}</div>
              <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            </div>
          )}
          <button onClick={handleLogout} className={cn('nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10', !sidebarOpen && 'justify-center px-0')}>
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span className="animate-fade-in">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
