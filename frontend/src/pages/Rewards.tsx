import { useEffect, useState } from 'react';
import { Star, Plus, Award, Shield, Heart, Zap, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

interface Reward {
  id: string; officer_name: string; callsign: string; category: string;
  title: string; description: string; issued_by: string; date: string;
}
interface OfficerRow { id: string; first_name: string; last_name: string; callsign?: string; }

const CATEGORIES = ['Commendation','Medal of Valor','Unit Citation','Community Service','Life-Saving Award','Perfect Attendance'];

const CAT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'Medal of Valor': Shield, 'Life-Saving Award': Heart, 'Commendation': Award, 'Unit Citation': Zap,
};
const CAT_COLOR: Record<string, { chip: string; border: string }> = {
  'Medal of Valor':    { chip: 'chip chip-red',    border: 'rgba(239,68,68,0.20)' },
  'Life-Saving Award': { chip: 'chip chip-pink',   border: 'rgba(236,72,153,0.20)' },
  'Commendation':      { chip: 'chip chip-blue',   border: 'rgba(14,165,233,0.20)' },
  'Unit Citation':     { chip: 'chip chip-purple', border: 'rgba(168,85,247,0.20)' },
  'Community Service': { chip: 'chip chip-green',  border: 'rgba(34,197,94,0.20)' },
};

const EMPTY = { officer_id: '', officer_name: '', callsign: '', category: 'Commendation', title: '', description: '' };

export default function Rewards() {
  const { auth } = useAuth();
  const isLeadership = ['admin','administrator','leadership','senior_command'].includes(auth.user?.role ?? '');

  const [rewards,    setRewards]   = useState<Reward[]>([]);
  const [officers,   setOfficers]  = useState<OfficerRow[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [catFilter,  setCatFilter] = useState('');
  const [showForm,   setShowForm]  = useState(false);
  const [saving,     setSaving]    = useState(false);
  const [form,       setForm]      = useState(EMPTY);

  useEffect(() => {
    Promise.all([
      api.get('/rewards'),
      api.get('/roster'),
    ]).then(([r, o]) => {
      setRewards(r.data);
      setOfficers(o.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = rewards.filter(r => !catFilter || r.category === catFilter);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/rewards', {
        officer_id: form.officer_id || null,
        officer_name: form.officer_name, callsign: form.callsign,
        category: form.category, title: form.title, description: form.description,
      });
      setRewards(prev => [res.data, ...prev]);
      setShowForm(false); setForm(EMPTY);
      toast.success('Award issued');
    } catch { toast.error('Failed to issue award'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this award?')) return;
    try {
      await api.delete(`/rewards/${id}`);
      setRewards(prev => prev.filter(r => r.id !== id));
      toast.success('Award deleted');
    } catch { toast.error('Failed to delete'); }
  }

  function selectOfficer(id: string) {
    const o = officers.find(x => x.id === id);
    if (o) setForm(p => ({ ...p, officer_id: id, officer_name: `${o.first_name} ${o.last_name}`, callsign: o.callsign ?? '' }));
    else setForm(p => ({ ...p, officer_id: id }));
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(234,179,8,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(234,179,8,0.20)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)' }}>
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Rewards & Commendations</h1>
              <p className="text-slate-500 text-sm">{filtered.length} award{filtered.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>
          {isLeadership && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Issue Award
            </button>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {['', ...CATEGORIES].map(c => (
          <button key={c || 'all'} onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${catFilter === c ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-white/5'}`}>
            {c || 'All'}
          </button>
        ))}
      </div>

      {/* Issue award modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(14,165,233,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
              <h2 className="font-bold text-white">Issue Award</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Officer</label>
                <select value={form.officer_id} onChange={e => selectOfficer(e.target.value)} className="nx-input" style={{ colorScheme: 'dark' }}>
                  <option value="">Select from roster…</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Officer Name</label>
                  <input required value={form.officer_name} onChange={e => setForm(p => ({ ...p, officer_name: e.target.value }))} placeholder="Full name" className="nx-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Callsign</label>
                  <input value={form.callsign} onChange={e => setForm(p => ({ ...p, callsign: e.target.value }))} placeholder="e.g. L-102" className="nx-input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="nx-input" style={{ colorScheme: 'dark' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Award Title</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Bravery Under Fire" className="nx-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the actions that earned this award…" className="nx-input resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Issuing…' : 'Issue Award'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Award cards */}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading awards…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500">No awards found.</p>
          {isLeadership && <p className="text-slate-600 text-sm mt-1">Use the "Issue Award" button to recognise outstanding officers.</p>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(r => {
            const Icon = CAT_ICON[r.category] ?? Star;
            const style = CAT_COLOR[r.category] ?? { chip: 'chip chip-gold', border: 'rgba(245,158,11,0.20)' };
            return (
              <div key={r.id} className="glass rounded-xl p-5 hover:border-yellow-500/20 transition-all" style={{ borderColor: style.border }}>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ background: `${style.border.replace('0.20','0.12')}`, border: `1px solid ${style.border}` }}>
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={style.chip}>{r.category}</span>
                    </div>
                    <h3 className="font-semibold text-white">{r.title}</h3>
                    <p className="text-sm text-sky-400 font-mono mt-0.5">{r.officer_name}{r.callsign ? ` · ${r.callsign}` : ''}</p>
                    {r.description && <p className="text-sm text-slate-400 mt-2 leading-relaxed">{r.description}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-slate-600">
                        Issued by <span className="text-slate-500">{r.issued_by}</span>
                        {r.date && <> · {format(new Date(r.date), 'dd MMM yyyy')}</>}
                      </div>
                      {isLeadership && (
                        <button onClick={() => handleDelete(r.id)} className="p-1 text-slate-700 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
