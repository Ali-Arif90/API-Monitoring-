import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import DashboardPage  from './pages/DashboardPage';
import PredictionsPage from './pages/PredictionsPage';
import AnalyticsPage  from './pages/AnalyticsPage';
import AlertsPage     from './pages/AlertsPage';
import ApiKeysPage    from './pages/ApiKeysPage';
import SettingsPage   from './pages/SettingsPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: true,
    },
  },
});

function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function HydrateAuth() {
  const hydrate = useAuthStore(s => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <HydrateAuth />
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
          <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />

          {/* Protected */}
          <Route path="/dashboard"   element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/predictions" element={<RequireAuth><PredictionsPage /></RequireAuth>} />
          <Route path="/analytics"   element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
          <Route path="/alerts"      element={<RequireAuth><AlertsPage /></RequireAuth>} />
          <Route path="/api-keys"    element={<RequireAuth><ApiKeysPage /></RequireAuth>} />
          <Route path="/settings"    element={<RequireAuth><SettingsPage /></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
