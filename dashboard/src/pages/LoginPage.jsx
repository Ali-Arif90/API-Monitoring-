import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AlertBanner } from '../components/ui/index';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Send email as the identifier — backend accepts email OR username
      const res = await authApi.login({ email: form.email, password: form.password });
      // Response shape: { success, data: { user, token }, message }
      const { user, token } = res.data;
      login(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-DEFAULT via-slate-900 to-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-DEFAULT to-teal-400 flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">API Monitor</div>
            <div className="text-xs text-teal-400 font-medium">AI-Powered Observability</div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Monitor APIs.<br />
            <span className="text-teal-400">Predict issues</span><br />
            before they happen.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Real-time anomaly detection, traffic forecasting, and performance regression analysis — all powered by the built-in AI engine.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[{ num: '99.9%', label: 'Uptime tracked' }, { num: '<5min', label: 'Alert latency' }, { num: '24h', label: 'Forecast horizon' }].map(({ num, label }) => (
              <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-xl font-bold text-teal-400">{num}</div>
                <div className="text-xs text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-600 relative">© 2025 API Monitor. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-DEFAULT to-teal-400 flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <div className="text-lg font-bold text-white">API Monitor</div>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-slate-400 mt-1">Sign in to your monitoring dashboard</p>
          </div>
          {error && <div className="mb-5"><AlertBanner type="error">{error}</AlertBanner></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@company.com" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-sm text-center text-slate-500">
            No account?{' '}
            <Link to="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
