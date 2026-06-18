import { useEffect, useState } from 'react';
import { ArrowRightLeft, Plus, X, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Transfer {
  id: string; officer_name?: string; officer_callsign?: string;
  from_division?: string; to_division: string;
  why_transfer?: string; skills?: string; time_in_current?: string; long_term_goals?: string;
  status: string; review_notes?: string; reviewed_by_name?: string; created_at: string;
}

const DEPARTMENTS = ['Academy', 'GD', 'Highway', 'CIRT', 'SOG', 'Commissioner Office'];
const LEADERSHIP = ['commissioner', 'commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

const STATUS_CFG = {
  pending:  { cls: 'chip-yellow', label: 'Pending' },
  approved: { cls: 'chip-green',  label: 'Approved' },
  denied:   { cls: 'chip-red',    label: 'Denied' },
};

export default function DivisionTransfers() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('');
  const [view,      setView]      = useState<'mine' | 'all'>('mine');
  const [showForm,  setShowForm]  = useState(false);
  const [selected,  setSelected]  = useState<Transfer | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    to_division: 'GD', why_transfer: '', skills: '', time_in_current: '', long_term_goals: '',
  });

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/transfers'); setTransfers(r.data.transfers); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/transfers', form); setShowForm(false); setForm({ to_division: 'GD', why_transfer: '', skills: '', time_in_current: '', long_term_goals: '' }); load(); }
    finally { setSaving(false); }
  };

  const review = async (id: string, status: 'approved' | 'denied') => {
    await api.put(`/transfers/${id}`, { status, review_notes: reviewNotes });
    setSelected(null); setReviewNotes(''); load();
  };

  const displayedTransfers = transfers.filter(t => {
    const isOwn = t.officer_name === `${auth.user?.first_name} ${auth.user?.last_name}`;
    if (view === 'mine' && !isLeader && !isOwn) return false;
    if (view === 'mine' && isLeader && !isOwn) return false;
    if (filter && t.status !== filter) return false;
    return true;
  });
  const allFiltered = transfers.filter(t => !filter || t.status === filter);
  const pendingCount = transfers.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(59,130,246,0.06))', border: '1px solid rgba(99,102,241,0.20)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <ArrowRightLeft className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Division Transfers</h1>
            <p className="text-slate-500 text-sm mt-0.5">{pendingCount} pending review</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isLeader && (
            <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.08)' }}>
              {(['mine', 'all'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>
                  {v === 'mine' ? 'Mine' : `All${pendingCount ? ` (${pendingCount})` : ''}`}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: '1px solid rgba(99,102,241,0.30)', boxShadow: '0 4px 14px rgba(99,102,241,0.20)' }}>
            <Plus className="w-4 h-4" /> Request Transfer
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex p-1 gap-1 rounded-xl w-fit" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.08)' }}>
        {['', 'pending', 'approved', 'denied'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === s ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : (isLeader && view === 'all' ? allFiltered : displayedTransfers).length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600 text-sm">No transfer requests found.</div>
      ) : (
        <div className="space-y-3">
          {(isLeader && view === 'all' ? allFiltered : displayedTransfers).map(t => {
            const sc = STATUS_CFG[t.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
            return (
              <div key={t.id} className="glass rounded-xl p-5 hover:border-indigo-500/15 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`chip text-xs ${sc.cls}`}>{sc.label}</span>
                      <span className="text-xs text-slate-500">{format(parseISO(t.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="font-bold text-white">
                      {t.officer_callsign ? <><span className="font-mono text-purple-400 mr-2 text-sm">{t.officer_callsign}</span></> : ''}
                      {t.officer_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span className="text-slate-500">{t.from_division ?? '—'}</span>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-white font-semibold">{t.to_division}</span>
                    </div>
                    {t.why_transfer && <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">{t.why_transfer}</p>}
                    {t.review_notes && <p className="text-xs text-slate-600 mt-1">Review: {t.review_notes}</p>}
                  </div>
                  {isLeader && t.status === 'pending' && (
                    <button onClick={() => { setSelected(t); setReviewNotes(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold chip-yellow flex-shrink-0">
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: '#0d0a14', border: '1px solid rgba(99,102,241,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.05)' }}>
              <h2 className="text-base font-bold text-white">Division Transfer Request</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Requesting Transfer To</label>
                <select value={form.to_division} onChange={e => setForm(p => ({ ...p, to_division: e.target.value }))}
                  className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  {DEPARTMENTS.filter(d => d !== auth.user?.department).map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              {[
                { k: 'why_transfer',    l: 'Why are you wanting to transfer?',                placeholder: 'Career goals, personal motivation, division interest…' },
                { k: 'skills',          l: 'What can you bring to this division?',             placeholder: 'Relevant skills, experience, certifications…' },
                { k: 'time_in_current', l: 'How long have you been in your current division?', placeholder: 'e.g. 3 months, 6 weeks…' },
                { k: 'long_term_goals', l: 'What are your long-term goals in this division?',  placeholder: 'Career aspirations, certifications you plan to pursue…' },
              ].map(q => (
                <div key={q.k}>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">{q.l} <span className="text-rose-400">*</span></label>
                  <textarea required rows={2} value={(form as Record<string, string>)[q.k]}
                    onChange={e => setForm(p => ({ ...p, [q.k]: e.target.value }))}
                    placeholder={q.placeholder} className="nx-input w-full resize-none text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                  {saving ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ background: '#0d0a14', border: '1px solid rgba(99,102,241,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.05)' }}>
              <div>
                <div className="text-base font-bold text-white">Review Transfer Request</div>
                <div className="text-xs text-slate-500 mt-0.5">{selected.officer_name} · {selected.from_division} → {selected.to_division}</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto">
              {[
                { l: 'Why Transferring', v: selected.why_transfer },
                { l: 'Skills / Contribution', v: selected.skills },
                { l: 'Time in Current Division', v: selected.time_in_current },
                { l: 'Long-term Goals', v: selected.long_term_goals },
              ].filter(q => q.v).map(q => (
                <div key={q.l} className="rounded-xl p-3.5" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">{q.l}</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{q.v}</p>
                </div>
              ))}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Review Notes</label>
                <textarea rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Decision feedback…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setSelected(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button onClick={() => review(selected.id, 'denied')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm chip-red">Deny</button>
                <button onClick={() => review(selected.id, 'approved')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>Approve</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
