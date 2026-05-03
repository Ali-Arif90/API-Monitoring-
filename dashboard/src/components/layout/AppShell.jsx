import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationToaster from '../ui/NotificationToaster';
import { useUIStore } from '../../store/uiStore';

export default function AppShell({ children, title, subtitle }) {
  const { sidebarOpen } = useUIStore();
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
      <NotificationToaster />
    </div>
  );
}
