import { useEffect, useState } from 'react';
import { TrendingUp, Plus, X, Star, ArrowUp } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Promotion {
  id: string; officer_id: string; officer_name: string; callsign?: string;
  department?: string; from_rank: string; to_rank: string;
  promoted_by_name: string; reason?: string; effective_date: string; created_at: string;
}
interface Officer { id: string; first_name: string; last_name: string; callsign?: string; rank: string; department: string; }

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const RANKS = [
  'Recruit', 'Probationary Constable', 'Constable', 'First Constable',
  'Senior Constable', 'Leading Senior Constable', 'Sergeant', 'Senior Sergeant',
  'Inspector', 'Superintendent', 'Commander',
  'Assistant Commissioner', 'Deputy Commissioner', 'Commissioner',
];
const RANK_COLORS: Record<string, string> = {
  'Recruit': '#94a3b8', 'Probationary Constable': '#94a3b8', 'Constable': '#38bdf8',
  'First Constable': '#38bdf8', 'Senior Constable': '#34d399', 'Leading Senior Constable': '#34d399',
  'Sergeant': '#a78bfa', 'Senior Sergeant': '#a78bfa', 'Inspector': '#f59e0b',
  'Superintendent': '#f59e0b', 'Commander': '#f97316', 'Assistant Commissioner': '#ef4444',
  'Deputy Commissioner': '#ef4444', 'Commissioner': '#fbbf24',
};

export default function Promotions() {
  const { auth } = useAuth();
  const canManage = LEADERSHIP.includes(auth.user?.role ?? '');
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ officer_id: '', to_rank: '', reason: '' });
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([api.get('/promotions'), ...(canManage ? [api.get('/roster')] : [])]).then(([p, r]) => {
      setPromos(p.data); if (r) setOfficers(r.data); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const selectOfficer = (id: string) => {
    const o = officers.find(x => x.id === id) ?? null;
    setSelectedOfficer(o);
    setForm(p => ({ ...p, officer_id: id, to_rank: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/promotions', form); setShowForm(false); setForm({ officer_id: '', to_rank: '', reason: '' }); setSelectedOfficer(null); load(); }
    finally { setSaving(false); }
  };

  const nextRanks = selectedOfficer ? RANKS.slice(RANKS.indexOf(selectedOfficer.rank) + 1) : RANKS;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.20)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Promotions</h1>
              <p className="text-slate-500 text-sm">{promos.length} promotions on record</p>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <Plus className="w-4 h-4" /> Issue Promotion
            </button>
          )}
        </div>
      </div>

      {/* Promo form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(168,85,247,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(168,85,247,0.12)', background: 'rgba(168,85,247,0.05)' }}>
              <h2 className="text-base font-bold text-white">Issue Promotion</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Officer <span className="text-rose-400">*</span></label>
                <select required value={form.officer_id} onChange={e => selectOfficer(e.target.value)} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="">Select officer…</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''} — {o.rank}</option>)}
                </select>
              </div>

              {selectedOfficer && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 mb-1">Current Rank</div>
                    <div className="font-bold text-sm" style={{ color: RANK_COLORS[selectedOfficer.rank] ?? '#94a3b8' }}>{selectedOfficer.rank}</div>
                  </div>
                  <ArrowUp className="w-5 h-5 text-purple-400 mx-2 flex-shrink-0" />
                  <div className="text-center">
                    <div className="text-xs text-slate-600 mb-1">Promote To</div>
                    <div className="font-bold text-sm" style={{ color: RANK_COLORS[form.to_rank] ?? '#a78bfa' }}>{form.to_rank || '—'}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Promote To <span className="text-rose-400">*</span></label>
                <select required value={form.to_rank} onChange={e => setForm(p => ({ ...p, to_rank: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="">Select new rank…</option>
                  {nextRanks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Reason / Citation</label>
                <textarea rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Outstanding performance, leadership qualities, completed X…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
                  {saving ? 'Promoting…' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records */}
      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : promos.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Star className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No promotions on record yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => (
            <div key={p.id} className="glass rounded-xl p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                  style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
                  {p.officer_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white">{p.officer_name}</span>
                    {p.callsign && <span className="text-sky-400 font-mono text-xs">{p.callsign}</span>}
                    {p.department && <span className="text-slate-600 text-xs">{p.department}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span style={{ color: RANK_COLORS[p.from_rank] ?? '#94a3b8' }}>{p.from_rank}</span>
                    <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold" style={{ color: RANK_COLORS[p.to_rank] ?? '#a78bfa' }}>{p.to_rank}</span>
                  </div>
                  {p.reason && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{p.reason}</p>}
                  <p className="text-xs text-slate-600 mt-1.5">Promoted by <span className="text-slate-400">{p.promoted_by_name}</span> · {format(parseISO(p.effective_date), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
