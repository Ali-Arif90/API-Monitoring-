import { useState } from 'react';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, CheckCircle, Clock } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { SectionHeader, EmptyState, Modal, Skeleton, StatCard, AlertBanner } from '../components/ui/index';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useApi';
import { fmtTime, fmtRelative } from '../lib/utils';
import { useUIStore } from '../store/uiStore';

function KeyRow({ k, onRevoke, notify }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(k.key || k.apiKey || '');
    setCopied(true);
    notify({ type: 'success', message: 'API key copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = (key) => {
    if (!key) return '—';
    return show ? key : key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
  };

  const isActive   = k.status === 'active'  || k.isActive  || !k.revokedAt;
  const isExpired  = k.status === 'expired' || (k.expiresAt && new Date(k.expiresAt) < new Date());
  const statusLabel = k.revokedAt ? 'revoked' : isExpired ? 'expired' : 'active';

  return (
    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">{k.name || 'Unnamed Key'}</span>
            <span className={
              statusLabel === 'active'  ? 'badge-green' :
              statusLabel === 'expired' ? 'badge-yellow' : 'badge-red'
            }>{statusLabel}</span>
            {k.environment && <span className="badge-blue">{k.environment}</span>}
          </div>

          <div className="mt-2 flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900 rounded-xl px-3 py-2 w-fit max-w-full">
            <span className="truncate">{maskedKey(k.key || k.apiKey)}</span>
            <button onClick={() => setShow(v => !v)} className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors">
              {show ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={copy} className={`flex-shrink-0 transition-colors ${copied ? 'text-teal-400' : 'text-slate-600 hover:text-teal-400'}`}>
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>Created {fmtRelative(k.createdAt || k.created_at)}</span>
            {k.lastUsedAt && <span>· Last used {fmtRelative(k.lastUsedAt)}</span>}
            {k.expiresAt  && <span>· Expires {fmtTime(k.expiresAt)}</span>}
            {k.totalHits  != null && <span>· {k.totalHits} hits</span>}
          </div>
        </div>

        {isActive && !k.revokedAt && (
          <div>
            {confirmRevoke ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Sure?</span>
                <button onClick={() => { onRevoke(k._id || k.id); setConfirmRevoke(false); }}
                  className="btn-danger text-xs py-1 px-2.5">Yes, Revoke</button>
                <button onClick={() => setConfirmRevoke(false)} className="btn-secondary text-xs py-1 px-2.5">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmRevoke(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all">
                <Trash2 size={12} /> Revoke
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const notify = useUIStore(s => s.addNotification);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey]   = useState(null);
  const [form, setForm]       = useState({ name: '', environment: 'production', expiryDays: 365 });

  const { data: keysData, isLoading } = useApiKeys();
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();

  const keys = keysData?.data || [];
  const active  = keys.filter(k => !k.revokedAt && !(k.expiresAt && new Date(k.expiresAt) < new Date()));
  const revoked = keys.filter(k => k.revokedAt);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await createMutation.mutateAsync(form);
      setNewKey(res.data?.apiKey || res.data?.key || res.data);
      setShowCreate(false);
      setForm({ name: '', environment: 'production', expiryDays: 365 });
    } catch (_) {}
  };

  return (
    <AppShell title="API Keys" subtitle="Manage authentication keys for your monitoring integrations">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Keys"  value={active.length}  icon={Key}         color="#10b981" />
        <StatCard label="Revoked Keys" value={revoked.length} icon={Trash2}      color="#ef4444" />
        <StatCard label="Total Keys"   value={keys.length}    icon={CheckCircle} color="#2D9CDB" />
      </div>

      {/* Newly created key banner */}
      {newKey && (
        <div className="mb-5">
          <AlertBanner type="success">
            <div className="space-y-2">
              <div className="font-semibold">API key created — copy it now, it won't be shown again.</div>
              <div className="flex items-center gap-2 font-mono text-xs bg-black/20 rounded-xl px-3 py-2 mt-2">
                <span className="break-all">{typeof newKey === 'string' ? newKey : JSON.stringify(newKey)}</span>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(typeof newKey === 'string' ? newKey : JSON.stringify(newKey));
                  notify({ type: 'success', message: 'Copied!' });
                }} className="flex-shrink-0 hover:text-white transition-colors"><Copy size={14} /></button>
              </div>
              <button onClick={() => setNewKey(null)} className="text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
            </div>
          </AlertBanner>
        </div>
      )}

      {/* Key list */}
      <div className="card">
        <SectionHeader title="Your API Keys" action={
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs py-1.5">
            <Plus size={14} /> New Key
          </button>
        } />
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : keys.length === 0 ? (
          <EmptyState icon={Key} title="No API keys yet"
            body="Create your first API key to start tracking API hits." />
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <KeyRow key={k._id || k.id} k={k} notify={notify}
                onRevoke={(id) => revokeMutation.mutate(id)} />
            ))}
          </div>
        )}
      </div>

      {/* How to use */}
      <div className="card mt-4">
        <SectionHeader title="How to use your API key" />
        <div className="space-y-3 text-sm text-slate-400">
          <p>Send API hit events to the ingest endpoint by including your key in the request header:</p>
          <pre className="bg-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono">{`POST /api/hit
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json

{
  "serviceName": "my-service",
  "endpoint": "/users/:id",
  "method": "GET",
  "statusCode": 200,
  "latency": 142,
  "timestamp": "${new Date().toISOString()}"
}`}</pre>
          <p className="text-xs text-slate-500">The AI prediction engine automatically analyses your traffic and generates predictions every 5 minutes.</p>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New API Key"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="create-key-form" type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Key'}
            </button>
          </>
        }>
        <form id="create-key-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Key Name</label>
            <input className="input" placeholder="e.g. Production Frontend" required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Environment</label>
            <select className="input" value={form.environment}
              onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
          <div>
            <label className="label">Expiry (days)</label>
            <input type="number" className="input" min={1} max={3650}
              value={form.expiryDays} onChange={e => setForm(f => ({ ...f, expiryDays: parseInt(e.target.value) }))} />
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
