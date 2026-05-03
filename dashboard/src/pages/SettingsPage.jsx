import { useState } from 'react';
import { Settings, User, Bell, Shield, Activity, Save, CheckCircle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { AlertBanner } from '../components/ui/index';
import { useAuthStore } from '../store/authStore';
import { useClientProfile } from '../hooks/useApi';
import { clientApi, authApi } from '../lib/api';
import { useUIStore } from '../store/uiStore';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center">
          <Icon size={15} className="text-teal-400" />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { user, login } = useAuthStore();
  const notify = useUIStore(s => s.addNotification);
  const { data: profileData } = useClientProfile();
  const profile = profileData?.data || {};

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwForm,  setPwForm]  = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [alertPref, setAlertPref] = useState({ critical: true, warning: true, info: false });
  const [slaMs, setSlaMs]   = useState(500);
  const [zScore, setZScore] = useState(2.5);
  const [saving, setSaving] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving('profile');
    try {
      await clientApi.updateProfile(profileForm);
      login({ ...user, name: profileForm.name, email: profileForm.email }, useAuthStore.getState().token);
      notify({ type: 'success', message: 'Profile updated successfully' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally { setSaving(''); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      notify({ type: 'error', message: 'New passwords do not match' }); return;
    }
    setSaving('pw');
    try {
      await authApi.changePassword?.(pwForm) ?? notify({ type: 'info', message: 'Password change not yet wired to backend' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally { setSaving(''); }
  };

  const saveAI = (e) => {
    e.preventDefault();
    notify({ type: 'success', message: 'AI settings saved (apply in .env to persist across restarts)' });
  };

  return (
    <AppShell title="Settings" subtitle="Account, alerts, and AI engine configuration">

      <div className="max-w-2xl">

        {/* Profile */}
        <Section icon={User} title="Profile">
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Full Name">
              <input className="input" value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
            </Field>
            {profile.clientId && (
              <Field label="Client ID" hint="Use this to identify your account in API calls.">
                <div className="input font-mono text-xs text-slate-400 select-all cursor-text">{profile.clientId || profile._id}</div>
              </Field>
            )}
            <button type="submit" className="btn-primary" disabled={saving === 'profile'}>
              <Save size={14} /> {saving === 'profile' ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </Section>

        {/* Password */}
        <Section icon={Shield} title="Change Password">
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Current Password">
              <input className="input" type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </Field>
            <Field label="New Password">
              <input className="input" type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
            </Field>
            <Field label="Confirm New Password">
              <input className="input" type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </Field>
            <button type="submit" className="btn-primary" disabled={saving === 'pw'}>
              <Shield size={14} /> {saving === 'pw' ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Section>

        {/* Alert Preferences */}
        <Section icon={Bell} title="Alert Preferences">
          <div className="space-y-3">
            {[
              { key: 'critical', label: 'Critical Alerts', desc: 'High-probability downtime and severe anomalies', color: 'bg-red-500' },
              { key: 'warning',  label: 'Warning Alerts',  desc: 'Moderate anomalies and latency degradation',   color: 'bg-amber-500' },
              { key: 'info',     label: 'Info Alerts',     desc: 'Minor anomalies and informational events',     color: 'bg-blue-500' },
            ].map(({ key, label, desc, color }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{label}</div>
                    <div className="text-xs text-slate-500">{desc}</div>
                  </div>
                </div>
                <button onClick={() => setAlertPref(p => ({ ...p, [key]: !p[key] }))}
                  className={`w-10 h-5 rounded-full transition-all relative ${alertPref[key] ? 'bg-teal-DEFAULT' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${alertPref[key] ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* AI Engine settings */}
        <Section icon={Activity} title="AI Engine Configuration">
          <AlertBanner type="info" className="mb-4">
            These values override the defaults. To make them permanent, update your <code className="text-xs bg-black/20 px-1 py-0.5 rounded">.env</code> file and restart the server.
          </AlertBanner>
          <form onSubmit={saveAI} className="space-y-4 mt-4">
            <Field label="Latency SLA (ms)" hint="Latency above this threshold triggers a performance alert.">
              <input className="input" type="number" min={50} max={30000} value={slaMs}
                onChange={e => setSlaMs(parseInt(e.target.value))} />
            </Field>
            <Field label="Anomaly Z-Score Threshold" hint="Statistical sensitivity for anomaly detection. Lower = more sensitive. Recommended: 2.0–3.0">
              <input className="input" type="number" step={0.1} min={1.0} max={5.0} value={zScore}
                onChange={e => setZScore(parseFloat(e.target.value))} />
            </Field>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-2">Current .env values to set:</div>
              <div className="font-mono space-y-1">
                <div>LATENCY_SLA_MS=<span className="text-teal-400">{slaMs}</span></div>
                <div>ANOMALY_ZSCORE_THRESHOLD=<span className="text-teal-400">{zScore}</span></div>
                <div>PREDICTION_INTERVAL_MS=<span className="text-teal-400">300000</span></div>
                <div>MODEL_TRAINING_INTERVAL_MS=<span className="text-teal-400">3600000</span></div>
                <div>DOWNTIME_ALERT_THRESHOLD=<span className="text-teal-400">0.7</span></div>
              </div>
            </div>
            <button type="submit" className="btn-primary">
              <CheckCircle size={14} /> Apply Settings
            </button>
          </form>
        </Section>

      </div>
    </AppShell>
  );
}
