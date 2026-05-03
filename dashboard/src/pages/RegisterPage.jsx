import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AlertBanner } from '../components/ui/index';

const FEATURES = [
  'Real-time API hit monitoring',
  'AI-powered downtime prediction',
  'Traffic forecasting with ML',
  'Instant anomaly alerts',
];

// Must match SecurityUtils.PASSWORD_REQUIREMENTS defaults in the backend
const PW_RULES = [
  { label: 'At least 8 characters',       test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',   test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',   test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)',             test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }) {
  if (!password) return null;
  const passed = PW_RULES.filter(r => r.test(password)).length;
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {PW_RULES.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < passed ? colors[passed - 1] : '#1e293b' }} />
        ))}
        <span className="text-[11px] ml-1 font-medium" style={{ color: colors[passed - 1] || '#6b7280' }}>
          {labels[passed - 1] || 'Too weak'}
        </span>
      </div>
      {/* Rule checklist */}
      <div className="grid grid-cols-1 gap-1">
        {PW_RULES.map(rule => {
          const ok = rule.test(password);
          return (
            <div key={rule.label} className="flex items-center gap-1.5">
              {ok
                ? <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" />
                : <XCircle    size={11} className="text-slate-600 flex-shrink-0" />}
              <span className={`text-[11px] ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const allRulesPassed = useMemo(() =>
    PW_RULES.every(r => r.test(form.password)), [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allRulesPassed) {
      setError('Please make sure your password meets all requirements below.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { user, token } = res.data;
      login(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-navy-DEFAULT to-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-teal-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
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
            Start monitoring<br /><span className="text-teal-400">in minutes.</span>
          </h2>
          <p className="text-slate-400">Join developers who trust API Monitor to keep their services reliable.</p>
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle size={16} className="text-teal-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-600 relative">No credit card required.</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-DEFAULT to-teal-400 flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <div className="text-lg font-bold text-white">API Monitor</div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-slate-400 mt-1">Start monitoring your APIs for free</p>
          </div>

          {error && <div className="mb-5"><AlertBanner type="error">{error}</AlertBanner></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" placeholder="John Smith" required
                value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@company.com" required
                value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className="input pr-10"
                  placeholder="Create a strong password" required
                  value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <button type="submit" disabled={loading || (form.password && !allRulesPassed)}
              className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}