import { useEffect, useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, Plus, X, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface FeedbackItem {
  id: string; category: string; sentiment: string;
  message: string; officer_name: string; department?: string;
  status: string; created_at: string; reviewed_by?: string;
}

const CATEGORIES = ['General','Leadership','Training','Equipment','Scheduling','Policy','Wellbeing'];
const SENTINEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  positive: ThumbsUp, negative: ThumbsDown, neutral: Minus,
};
const SENT_CLS: Record<string, string> = {
  positive: 'chip chip-green', negative: 'chip chip-red', neutral: 'chip chip-yellow',
};

const EMPTY = { category: 'General', sentiment: 'neutral' as const, message: '', anonymous: false };

export default function FeedbackViewer() {
  const { auth } = useAuth();
  const isLeadership = ['commissioner','admin','administrator','leadership','senior_command','supervisor'].includes(auth.user?.role ?? '');

  const [items,     setItems]     = useState<FeedbackItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [sentFilter,setSentFilter]= useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY);

  useEffect(() => {
    api.get('/feedback').then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(f =>
    (!catFilter || f.category === catFilter) && (!sentFilter || f.sentiment === sentFilter)
  );
  const unread = items.filter(f => f.status === 'unread').length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/feedback', form);
      setItems(prev => [res.data, ...prev]);
      setShowForm(false); setForm(EMPTY);
      toast.success('Feedback submitted');
    } catch { toast.error('Failed to submit'); }
    finally { setSaving(false); }
  }

  async function markReviewed(id: string) {
    try {
      const res = await api.put(`/feedback/${id}`, {});
      setItems(prev => prev.map(f => f.id === id ? res.data : f));
    } catch { toast.error('Failed to update'); }
  }

  async function del(id: string) {
    if (!confirm('Delete this feedback?')) return;
    try {
      await api.delete(`/feedback/${id}`);
      setItems(prev => prev.filter(f => f.id !== id));
    } catch { toast.error('Failed to delete'); }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.18)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl relative" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <MessageSquare className="w-6 h-6 text-blue-400" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Feedback</h1>
              <p className="text-slate-500 text-sm">{unread > 0 ? `${unread} unread` : 'All caught up'} · {items.length} total submissions</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Submit Feedback
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {['', ...CATEGORIES].map(c => (
            <button key={c || 'all'} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${catFilter === c ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-white/5'}`}>
              {c || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {['', 'positive', 'neutral', 'negative'].map(s => (
            <button key={s || 'all'} onClick={() => setSentFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${sentFilter === s ? 'bg-white/10 text-white border-white/15' : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-white/5'}`}>
              {s || 'All Sentiment'}
            </button>
          ))}
        </div>
      </div>

      {/* Submit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h2 className="font-bold text-white">Submit Feedback</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="nx-input" style={{ colorScheme: 'dark' }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Sentiment</label>
                  <select value={form.sentiment} onChange={e => setForm(p => ({ ...p, sentiment: e.target.value as typeof form.sentiment }))} className="nx-input" style={{ colorScheme: 'dark' }}>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Message</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Share your thoughts, concerns, or commendations…" className="nx-input resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.anonymous} onChange={e => setForm(p => ({ ...p, anonymous: e.target.checked }))} className="w-4 h-4 accent-sky-500" />
                <span className="text-sm text-slate-400">Submit anonymously</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback list */}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading feedback…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500">No feedback yet.</p>
          <p className="text-slate-600 text-sm mt-1">Be the first to submit feedback above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const Icon = SENTINEL_ICON[f.sentiment] ?? Minus;
            return (
              <div key={f.id} className={`glass rounded-xl p-4 transition-all ${f.status === 'unread' ? 'border-blue-500/20' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${SENT_CLS[f.sentiment] ?? 'chip chip-gray'}`} style={{ border: 'none' }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="chip chip-blue">{f.category}</span>
                      <span className={SENT_CLS[f.sentiment] ?? 'chip chip-gray'}>{f.sentiment}</span>
                      {f.status === 'unread' && <span className="chip chip-gold">New</span>}
                      {f.department && <span className="chip chip-gray">{f.department}</span>}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{f.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-slate-600">
                        <span className="text-slate-500">{f.officer_name ?? 'Anonymous'}</span>
                        {' · '}{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                        {f.reviewed_by && <span className="ml-2 text-green-600">· Reviewed by {f.reviewed_by}</span>}
                      </div>
                      {isLeadership && (
                        <div className="flex items-center gap-1.5">
                          {f.status === 'unread' && (
                            <button onClick={() => markReviewed(f.id)} title="Mark reviewed"
                              className="p-1.5 text-slate-600 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => del(f.id)}
                            className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
