import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, clientApi, analyticsApi, predApi } from '../lib/api';
import { useUIStore } from '../store/uiStore';

const Q = 30000; // 30s default refetch interval

// ── Auth ──────────────────────────────────────────────────────────────────────
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => authApi.me(), retry: false, staleTime: 60000 });
}

// ── Dashboard overview ────────────────────────────────────────────────────────
export function useHealthScore() {
  return useQuery({ queryKey: ['health-score'], queryFn: predApi.getHealthScore, refetchInterval: Q, staleTime: 10000 });
}
export function useMetricsSummary(hours = 24) {
  return useQuery({ queryKey: ['metrics-summary', hours], queryFn: () => predApi.getMetricsSummary(hours), refetchInterval: Q });
}
export function useHourlyTraffic(hours = 168) {
  return useQuery({ queryKey: ['hourly-traffic', hours], queryFn: () => predApi.getHourlyTraffic(hours), refetchInterval: Q });
}

// ── Predictions ───────────────────────────────────────────────────────────────
export function useAnomalies(hours = 24) {
  return useQuery({ queryKey: ['anomalies', hours], queryFn: () => predApi.getAnomalies(hours), refetchInterval: Q });
}
export function useDowntimePredictions(svc) {
  return useQuery({ queryKey: ['downtime', svc], queryFn: () => predApi.getDowntime(svc), refetchInterval: Q });
}
export function useTrafficForecast() {
  return useQuery({ queryKey: ['traffic-forecast'], queryFn: predApi.getTraffic, refetchInterval: Q });
}
export function usePerformanceData(svc) {
  return useQuery({ queryKey: ['performance', svc], queryFn: () => predApi.getPerformance(svc), refetchInterval: Q });
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export function useAlerts(params = '') {
  return useQuery({ queryKey: ['alerts', params], queryFn: () => predApi.getAlerts(params), refetchInterval: Q });
}
export function useAlertStats(hours = 24) {
  return useQuery({ queryKey: ['alert-stats', hours], queryFn: () => predApi.getAlertStats(hours), refetchInterval: Q });
}
export function useAckAlert() {
  const qc = useQueryClient();
  const notify = useUIStore(s => s.addNotification);
  return useMutation({
    mutationFn: (id) => predApi.ackAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alert-stats'] });
      notify({ type: 'success', message: 'Alert acknowledged' });
    },
    onError: (e) => notify({ type: 'error', message: e.message }),
  });
}

// ── API Keys ──────────────────────────────────────────────────────────────────
export function useApiKeys() {
  return useQuery({ queryKey: ['api-keys'], queryFn: clientApi.getApiKeys, staleTime: 30000 });
}
export function useCreateApiKey() {
  const qc = useQueryClient();
  const notify = useUIStore(s => s.addNotification);
  return useMutation({
    mutationFn: clientApi.createApiKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      notify({ type: 'success', message: 'API key created successfully' });
    },
    onError: (e) => notify({ type: 'error', message: e.message }),
  });
}
export function useRevokeApiKey() {
  const qc = useQueryClient();
  const notify = useUIStore(s => s.addNotification);
  return useMutation({
    mutationFn: clientApi.revokeApiKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      notify({ type: 'success', message: 'API key revoked' });
    },
    onError: (e) => notify({ type: 'error', message: e.message }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useEndpointMetrics(params = '') {
  return useQuery({ queryKey: ['endpoint-metrics', params], queryFn: () => analyticsApi.getMetrics(params), refetchInterval: Q });
}
export function useClientProfile() {
  return useQuery({ queryKey: ['client-profile'], queryFn: clientApi.getProfile, staleTime: 60000 });
}
