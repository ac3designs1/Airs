import { useEffect, useState } from 'react';
import { Megaphone, Plus, Pin, X, Edit2, Trash2, AlertCircle, Info, BookOpen, Calendar } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

interface Announcement {
  id: string; title: string; content: string; category: string;
  author_name?: string; pinned: number; created_at: string; updated_at: string;
}

const LEADERSHIP = ['commissioner', 'admin', 'administrator', 'leadership', 'senior_command'];
const CATEGORIES = ['general', 'urgent', 'training', 'events', 'policy'];

const CAT_CFG: Record<string, { cls: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  general:  { cls: 'chip-blue',   icon: Info,         label: 'General' },
  urgent:   { cls: 'chip-red',    icon: AlertCircle,  label: 'Urgent' },
  training: { cls: 'chip-green',  icon: BookOpen,     label: 'Training' },
  events:   { cls: 'chip-yellow', icon: Calendar,     label: 'Event' },
  policy:   { cls: 'chip-gray',   icon: Megaphone,    label: 'Policy' },
};

const blank = { title: '', content: '', category: 'general', pinned: false };

export default function Announcements() {
  const { auth } = useAuth();
  const canManage = LEADERSHIP.includes(auth.user?.role ?? '');
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/announcements').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setForm({ title: a.title, content: a.content, category: a.category, pinned: !!a.pinned }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) {
        const r = await api.put(`/announcements/${editing.id}`, form);
        setItems(prev => prev.map(a => a.id === editing.id ? r.data : a));
      } else {
        const r = await api.post('/announcements', form);
        setItems(prev => [r.data, ...prev]);
      }
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    setItems(prev => prev.filter(a => a.id !== id));
  };

  const displayed = items.filter(a => catFilter === 'all' || a.category === catFilter);
  const pinned = displayed.filter(a => a.pinned);
  const regular = displayed.filter(a => !a.pinned);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(251,191,36,0.04))', border: '1px solid rgba(245,158,11,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Megaphone className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Announcements</h1>
            <p className="text-slate-500 text-sm mt-0.5">{items.length} posts · {items.filter(a => a.pinned).length} pinned</p>
          </div>
        </div>
        {canManage && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 4px 14px rgba(245,158,11,0.20)' }}>
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCatFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${catFilter === 'all' ? 'chip-yellow' : 'chip-gray hover:text-slate-300'}`}>
          All ({items.length})
        </button>
        {CATEGORIES.map(c => {
          const cfg = CAT_CFG[c];
          return (
            <button key={c} onClick={() => setCatFilter(c === catFilter ? 'all' : c)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${catFilter === c ? cfg.cls : 'chip-gray hover:text-slate-300'}`}>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0d0a14', border: '1px solid rgba(245,158,11,0.18)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.05)' }}>
              <h2 className="text-base font-bold text-white">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Title <span className="text-rose-400">*</span></label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title…" className="nx-input w-full" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Content <span className="text-rose-400">*</span></label>
                <textarea required rows={5} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write the full announcement here…" className="nx-input w-full resize-none text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="nx-input w-full" style={{ colorScheme: 'dark' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_CFG[c].label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))}
                      className="w-4 h-4 rounded accent-amber-500" />
                    <span className="text-sm text-slate-300">Pin to top</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Megaphone className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-slate-600 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...pinned, ...regular].map(a => {
            const cfg = CAT_CFG[a.category] ?? CAT_CFG.general;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`glass rounded-xl p-5 transition-all ${a.pinned ? 'border-amber-500/25' : ''}`}
                style={a.pinned ? { background: 'rgba(245,158,11,0.04)' } : {}}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {a.pinned ? <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" style={{ transform: 'rotate(45deg)' }} /> : null}
                      <span className={`chip flex items-center gap-1 text-[10px] ${cfg.cls}`}><Icon className="w-3 h-3" />{cfg.label}</span>
                      <span className="text-[10px] text-slate-600">{formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}</span>
                    </div>
                    <h3 className="font-bold text-white text-base mb-2">{a.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-slate-600 mt-3">Posted by <span className="text-slate-400">{a.author_name ?? 'Leadership'}</span> · {format(parseISO(a.created_at), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-600 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(a.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
