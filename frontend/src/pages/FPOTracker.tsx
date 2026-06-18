import { useEffect, useState } from 'react';
import { Shield, Plus, Search, X, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface FPO {
  id: string; officer_id: string; officer_name?: string; officer_callsign?: string;
  department?: string; rank?: string; cert_number: string;
  issued_by_name?: string; status: string;
  issued_date: string; expiry_date?: string; notes?: string;
}
interface Officer { id: string; first_name: string; last_name: string; callsign?: string; rank: string; department: string; }

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

export default function FPOTracker() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [fpos,    setFpos]    = useState<FPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('active');
  const [search,  setSearch]  = useState('');
  const [showForm,setShowForm]= useState(false);
  const [officers,setOfficers]= useState<Officer[]>([]);
  const [form, setForm] = useState({ officer_id: '', expiry_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get(`/fpos?status=${status}`); setFpos(r.data.fpos); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  useEffect(() => {
    if (showForm && isLeader) {
      api.get('/roster').then(r => setOfficers(r.data)).catch(() => {});
    }
  }, [showForm, isLeader]);

  const revoke = async (id: string) => {
    await api.put(`/fpos/${id}`, { status: 'revoked' });
    load();
  };

  const issue = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/fpos', form);
      setShowForm(false); setForm({ officer_id: '', expiry_date: '', notes: '' });
      if (status === 'active') load();
    } finally { setSaving(false); }
  };

  const filtered = fpos.filter(f => {
    const q = search.toLowerCase();
    return !q || (f.officer_name ?? '').toLowerCase().includes(q) || (f.officer_callsign ?? '').toLowerCase().includes(q) || (f.department ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">FPO Tracker</h1>
              <p className="text-slate-500 text-sm">Field Placement Officer certifications — {filtered.length} {status}</p>
            </div>
          </div>
          {isLeader && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Plus className="w-4 h-4" /> Issue FPO
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.08)' }}>
          {['active', 'revoked', 'expired'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${status === s ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}>{s}</button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search officer, department…" className="nx-input pl-9 text-sm w-full" />
        </div>
      </div>

      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Shield className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No {status} FPO certifications.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(f => (
            <div key={f.id} className="glass rounded-xl p-5 transition-all hover:border-blue-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs text-slate-500">{f.cert_number}</span>
                    <span className={`chip text-[10px] ${f.status === 'active' ? 'chip-green' : f.status === 'revoked' ? 'chip-red' : 'chip-gray'}`}>{f.status}</span>
                  </div>
                  <div className="font-bold text-white">{f.officer_name ?? '—'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {f.officer_callsign && <span className="font-mono text-sky-400 mr-2">{f.officer_callsign}</span>}
                    {f.rank} · {f.department}
                  </div>
                  {f.notes && <p className="text-xs text-slate-600 mt-1.5">{f.notes}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    <span>Issued: {format(parseISO(f.issued_date), 'dd MMM yyyy')}</span>
                    {f.expiry_date && <span className="text-amber-600">Expires: {format(parseISO(f.expiry_date), 'dd MMM yyyy')}</span>}
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">By: {f.issued_by_name}</div>
                </div>
                {isLeader && f.status === 'active' && (
                  <button onClick={() => revoke(f.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Revoke">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue FPO modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(59,130,246,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(59,130,246,0.12)', background: 'rgba(59,130,246,0.05)' }}>
              <h2 className="text-base font-bold text-white">Issue FPO Certification</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={issue} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Officer <span className="text-rose-400">*</span></label>
                <select required value={form.officer_id} onChange={e => setForm(p => ({ ...p, officer_id: e.target.value }))}
                  className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="">Select officer…</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''} — {o.rank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Expiry Date (optional)</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                  className="nx-input w-full" style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="nx-input w-full" placeholder="Optional remarks…" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                  <CheckCircle className="w-4 h-4" />{saving ? 'Issuing…' : 'Issue FPO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
