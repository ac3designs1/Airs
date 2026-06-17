import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, X, ChevronRight, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Termination {
  id: string; officer_id: string; officer_name?: string; officer_callsign?: string;
  department?: string; rank?: string; reason: string; evidence?: string;
  requested_by_name?: string; reviewed_by_name?: string;
  status: string; review_notes?: string; created_at: string;
}
interface Officer { id: string; first_name: string; last_name: string; callsign?: string; rank: string; department: string; }

const STATUS_CFG = {
  pending:  { cls: 'chip-yellow', label: 'Pending' },
  approved: { cls: 'chip-red',    label: 'Approved' },
  denied:   { cls: 'chip-green',  label: 'Denied' },
};

export default function TerminationApproval() {
  const { auth } = useAuth();
  const [terms,    setTerms]    = useState<Termination[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [statusF,  setStatusF]  = useState('pending');
  const [selected, setSelected] = useState<Termination | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [form, setForm] = useState({ officer_id: '', reason: '', evidence: '' });
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get(`/terminations${statusF ? `?status=${statusF}` : ''}`); setTerms(r.data.terminations); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusF]);
  useEffect(() => { if (showForm) api.get('/roster').then(r => setOfficers(r.data)).catch(() => {}); }, [showForm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/terminations', form); setShowForm(false); setForm({ officer_id: '', reason: '', evidence: '' }); load(); }
    finally { setSaving(false); }
  };

  const review = async (id: string, status: 'approved' | 'denied') => {
    await api.put(`/terminations/${id}`, { status, review_notes: reviewNotes });
    setSelected(null); setReviewNotes(''); load();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Termination Approval</h1>
              <p className="text-slate-500 text-sm">Review and process termination requests</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex p-1 gap-1 rounded-xl w-fit" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.08)' }}>
        {['pending', 'approved', 'denied', ''].map(s => (
          <button key={s} onClick={() => setStatusF(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusF === s ? 'bg-red-500/20 text-red-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      : terms.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No {statusF} termination requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map(t => {
            const sc = STATUS_CFG[t.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
            return (
              <div key={t.id} className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`chip text-xs ${sc.cls}`}>{sc.label}</span>
                      <span className="text-xs text-slate-500">{format(parseISO(t.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="font-bold text-white">{t.officer_name ?? '—'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.officer_callsign && <span className="font-mono text-sky-400 mr-2">{t.officer_callsign}</span>}
                      {t.rank} · {t.department}
                    </div>
                    <p className="text-sm text-slate-300 mt-2">{t.reason}</p>
                    {t.evidence && <p className="text-xs text-slate-600 mt-1">{t.evidence}</p>}
                    <div className="text-xs text-slate-700 mt-1.5">Requested by: {t.requested_by_name}</div>
                    {t.review_notes && <p className="text-xs text-slate-600 mt-1">Review: {t.review_notes}</p>}
                  </div>
                  {t.status === 'pending' && (
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

      {/* New request modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.05)' }}>
              <h2 className="text-base font-bold text-white">Submit Termination Request</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Officer <span className="text-rose-400">*</span></label>
                <select required value={form.officer_id} onChange={e => setForm(p => ({ ...p, officer_id: e.target.value }))}
                  className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  <option value="">Select officer…</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Reason <span className="text-rose-400">*</span></label>
                <textarea required rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Detailed reason for termination request…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Evidence / Supporting Notes</label>
                <textarea rows={2} value={form.evidence} onChange={e => setForm(p => ({ ...p, evidence: e.target.value }))}
                  placeholder="Links, incidents, prior strikes…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
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
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(8,12,24,0.99)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.05)' }}>
              <div>
                <div className="text-base font-bold text-white">Review Termination</div>
                <div className="text-xs text-slate-500 mt-0.5">{selected.officer_name}</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl p-3.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Reason</div>
                <p className="text-sm text-slate-300">{selected.reason}</p>
                {selected.evidence && <p className="text-xs text-slate-600 mt-1.5">{selected.evidence}</p>}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Review Notes</label>
                <textarea rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Decision notes…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setSelected(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white">Cancel</button>
                <button onClick={() => review(selected.id, 'denied')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm chip-green">Deny</button>
                <button onClick={() => review(selected.id, 'approved')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-1"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
