import { useEffect, useState } from 'react';
import { AlertOctagon, Plus, X, ChevronDown, Search, Trash2, Shield } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

interface Strike {
  id: string; officer_id: string; officer_name: string; callsign?: string;
  department?: string; issued_by_name: string; reason: string;
  severity: 'minor' | 'moderate' | 'major' | 'final';
  status: 'active' | 'appealed' | 'dismissed'; appeal_notes?: string; created_at: string;
}
interface Officer { id: string; first_name: string; last_name: string; callsign?: string; rank: string; department: string; }

const LEADERSHIP = ['commissioner', 'commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const SEV_CFG = {
  minor:    { cls: 'chip-yellow', label: 'Minor' },
  moderate: { cls: 'chip-yellow', label: 'Moderate' },
  major:    { cls: 'chip-red',    label: 'Major' },
  final:    { cls: 'chip-red',    label: 'Final Warning' },
};
const STATUS_CFG = {
  active:    { cls: 'chip-red',    label: 'Active' },
  appealed:  { cls: 'chip-yellow', label: 'Appealed' },
  dismissed: { cls: 'chip-gray',   label: 'Dismissed' },
};

export default function Strikes() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ officer_id: '', reason: '', severity: 'minor' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([api.get('/strikes'), ...(isLeader ? [api.get('/roster')] : [])]).then(([s, r]) => {
      setStrikes(s.data);
      if (r) setOfficers(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/strikes', form); setShowForm(false); setForm({ officer_id: '', reason: '', severity: 'minor' }); load(); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/strikes/${id}`, { status });
    setStrikes(prev => prev.map(s => s.id === id ? { ...s, status: status as Strike['status'] } : s));
  };

  const del = async (id: string) => {
    if (!confirm('Delete this strike record?')) return;
    await api.delete(`/strikes/${id}`);
    setStrikes(prev => prev.filter(s => s.id !== id));
  };

  const filtered = strikes.filter(s => {
    const q = search.toLowerCase();
    return (filter === 'all' || s.status === filter || s.severity === filter)
      && (!q || `${s.officer_name} ${s.callsign ?? ''}`.toLowerCase().includes(q));
  });

  const active = strikes.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(245,158,11,0.04))', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertOctagon className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Strikes & Demerits</h1>
            <p className="text-slate-500 text-sm mt-0.5">{active} active · {strikes.length} total records</p>
          </div>
        </div>
        {isLeader && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 4px 14px rgba(239,68,68,0.20)' }}>
            <Plus className="w-4 h-4" /> Issue Strike
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[{ v: 'all', l: 'All' }, { v: 'active', l: 'Active' }, { v: 'appealed', l: 'Appealed' }, { v: 'dismissed', l: 'Dismissed' }, { v: 'minor', l: 'Minor' }, { v: 'major', l: 'Major' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f.v ? 'chip-red' : 'chip-gray hover:text-slate-300'}`}>{f.l}</button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search officer…" className="nx-input pl-9 text-sm py-2" style={{ minWidth: 200 }} />
        </div>
      </div>

      {/* Issue form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0d1526', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.05)' }}>
              <h2 className="text-base font-bold text-white">Issue Strike / Demerit</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Officer <span className="text-rose-400">*</span></label>
                <select required value={form.officer_id} onChange={e => setForm(p => ({ ...p, officer_id: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="">Select officer…</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Severity <span className="text-rose-400">*</span></label>
                <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="final">Final Warning</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Reason <span className="text-rose-400">*</span></label>
                <textarea required rows={4} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Describe the reason for this strike/demerit in detail…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  {saving ? 'Issuing…' : 'Issue Strike'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Shield className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">{isLeader ? 'No strike records found.' : 'You have no strikes on record.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const sc = STATUS_CFG[s.status];
            const sv = SEV_CFG[s.severity];
            return (
              <div key={s.id} className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`chip text-[10px] ${sv.cls}`}>{sv.label}</span>
                      <span className={`chip text-[10px] ${sc.cls}`}>{sc.label}</span>
                      {isLeader && s.callsign && <span className="font-mono text-cyan-400 text-xs">{s.callsign}</span>}
                      {isLeader && s.department && <span className="text-xs text-slate-600">{s.department}</span>}
                    </div>
                    {isLeader && <div className="font-semibold text-white mb-1">{s.officer_name}</div>}
                    <p className="text-sm text-slate-400 leading-relaxed">{s.reason}</p>
                    <p className="text-xs text-slate-600 mt-2">Issued by <span className="text-slate-400">{s.issued_by_name}</span> · {formatDistanceToNow(parseISO(s.created_at), { addSuffix: true })}</p>
                    {s.appeal_notes && <p className="text-xs text-slate-500 mt-1">Notes: {s.appeal_notes}</p>}
                  </div>
                  {isLeader && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      {s.status === 'active' && (
                        <button onClick={() => updateStatus(s.id, 'dismissed')}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold chip-gray flex items-center gap-1">
                          <ChevronDown className="w-3 h-3" /> Dismiss
                        </button>
                      )}
                      <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
