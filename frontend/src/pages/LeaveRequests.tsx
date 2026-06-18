import { useEffect, useState } from 'react';
import { ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock, X, MessageSquare } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

interface Leave {
  id: string; officer_id: string; officer_name: string; callsign?: string;
  department?: string; leave_type: string; start_date: string; end_date: string;
  reason?: string; status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string; review_notes?: string; reviewed_at?: string; created_at: string;
}

const LEADERSHIP = ['commissioner', 'commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];
const TYPES = ['Annual Leave', 'Personal Leave', 'Medical Leave', 'Leave of Absence', 'Special Circumstances'];

const STATUS_CFG = {
  pending:  { cls: 'chip-yellow', icon: Clock },
  approved: { cls: 'chip-green',  icon: CheckCircle2 },
  denied:   { cls: 'chip-red',    icon: XCircle },
};

export default function LeaveRequests() {
  const { auth } = useAuth();
  const isLeader = LEADERSHIP.includes(auth.user?.role ?? '');
  const [requests, setRequests] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Leave | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leave_type: 'Annual Leave', start_date: '', end_date: '', reason: '' });

  const load = () => api.get('/leave').then(r => { setRequests(r.data); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/leave', form);
    setShowForm(false);
    setForm({ leave_type: 'Annual Leave', start_date: '', end_date: '', reason: '' });
    load();
  };

  const review = async (id: string, status: 'approved' | 'denied') => {
    setSaving(true);
    try {
      const updated = await api.put(`/leave/${id}`, { status, review_notes: noteText });
      setRequests(prev => prev.map(r => r.id === id ? updated.data : r));
      if (selected?.id === id) setSelected(updated.data);
    } finally { setSaving(false); }
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.06))', border: '1px solid rgba(99,102,241,0.20)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <ArrowRightLeft className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Leave Requests</h1>
            <p className="text-slate-500 text-sm mt-0.5">{pending} pending · {requests.length} total</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 4px 14px rgba(99,102,241,0.20)' }}>
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ v: 'all', l: `All (${requests.length})` }, { v: 'pending', l: `Pending (${pending})` }, { v: 'approved', l: 'Approved' }, { v: 'denied', l: 'Denied' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${filter === f.v ? 'chip-blue' : 'chip-gray hover:text-slate-300'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Submit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0d1526', border: '1px solid rgba(99,102,241,0.20)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.05)' }}>
              <h2 className="text-base font-bold text-white">Submit Leave Request</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Leave Type <span className="text-rose-400">*</span></label>
                <select required value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ k: 'start_date', l: 'Start Date' }, { k: 'end_date', l: 'End Date' }].map(f => (
                  <div key={f.k}>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">{f.l} <span className="text-rose-400">*</span></label>
                    <input required type="date" value={(form as Record<string, string>)[f.k]}
                      onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      className="nx-input w-full" style={{ colorScheme: 'dark' }} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Reason / Details</label>
                <textarea rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Provide any relevant details about your leave request…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No leave requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = STATUS_CFG[r.status];
            const Icon = sc.icon;
            const days = differenceInCalendarDays(parseISO(r.end_date), parseISO(r.start_date)) + 1;
            return (
              <div key={r.id} className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className={`chip flex items-center gap-1 text-xs ${sc.cls}`}><Icon className="w-3 h-3" />{r.status}</span>
                      <span className="chip chip-blue text-[10px]">{r.leave_type}</span>
                      {isLeader && r.callsign && <span className="font-mono text-cyan-400 text-xs">{r.callsign}</span>}
                    </div>
                    {isLeader && <div className="font-semibold text-white mb-1">{r.officer_name}</div>}
                    <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                      <span>{format(parseISO(r.start_date), 'dd MMM')} – {format(parseISO(r.end_date), 'dd MMM yyyy')}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-cyan-400 font-semibold">{days} day{days !== 1 ? 's' : ''}</span>
                    </div>
                    {r.reason && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{r.reason}</p>}
                    {r.reviewed_by && (
                      <p className="text-xs text-slate-600 mt-1.5">Reviewed by <span className="text-slate-400">{r.reviewed_by}</span>
                        {r.review_notes && <span> · <span className="text-slate-400">{r.review_notes}</span></span>}
                      </p>
                    )}
                  </div>
                  {isLeader && r.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {selected?.id !== r.id ? (
                        <button onClick={() => { setSelected(r); setNoteText(''); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold chip-blue flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Review
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <input value={noteText} onChange={e => setNoteText(e.target.value)}
                            placeholder="Optional decision note…" className="nx-input text-xs py-1.5" />
                          <div className="flex gap-2">
                            <button onClick={() => review(r.id, 'approved')} disabled={saving}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold chip-green flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => review(r.id, 'denied')} disabled={saving}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold chip-red flex items-center justify-center gap-1">
                              <XCircle className="w-3 h-3" /> Deny
                            </button>
                          </div>
                          <button onClick={() => setSelected(null)} className="text-xs text-slate-600 hover:text-slate-400">Cancel</button>
                        </div>
                      )}
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
