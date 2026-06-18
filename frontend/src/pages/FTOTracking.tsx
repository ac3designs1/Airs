import { useEffect, useState } from 'react';
import { Award, Clock, Plus, X, TrendingUp, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface FTOShift {
  id: string; fto_name: string; recruit_name: string; date: string;
  hours: number; type: string; notes: string; created_at: string;
}
interface OfficerRow { id: string; first_name: string; last_name: string; rank: string; callsign?: string; }

const SHIFT_TYPES = ['Field Patrol','Traffic Enforcement','Criminal Response','Report Writing','Use of Force','Tactical','Community Engagement'];

const EMPTY = { fto_name: '', recruit_name: '', date: new Date().toISOString().split('T')[0], hours: '8', type: 'Field Patrol', notes: '' };

export default function FTOTracking() {
  const { auth } = useAuth();
  const isLeadership = ['commissioner','admin','administrator','leadership','senior_command','supervisor'].includes(auth.user?.role ?? '');

  const [shifts,    setShifts]    = useState<FTOShift[]>([]);
  const [officers,  setOfficers]  = useState<OfficerRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY);

  useEffect(() => {
    Promise.all([
      api.get('/fto-shifts'),
      api.get('/roster'),
    ]).then(([s, r]) => {
      setShifts(s.data);
      setOfficers(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const ftoStats = [...new Set(shifts.map(s => s.fto_name))].map(fto => ({
    fto,
    recruits: [...new Set(shifts.filter(s => s.fto_name === fto).map(s => s.recruit_name))],
    totalHours: shifts.filter(s => s.fto_name === fto).reduce((a, b) => a + b.hours, 0),
    sessions: shifts.filter(s => s.fto_name === fto).length,
  }));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/fto-shifts', {
        fto_name: form.fto_name, recruit_name: form.recruit_name,
        date: form.date, hours: parseFloat(form.hours), type: form.type, notes: form.notes,
      });
      setShifts(prev => [res.data, ...prev]);
      setShowForm(false);
      setForm(EMPTY);
      toast.success('FTO shift logged');
    } catch {
      toast.error('Failed to log shift');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shift log?')) return;
    try {
      await api.delete(`/fto-shifts/${id}`);
      setShifts(prev => prev.filter(s => s.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const officerName = (o: OfficerRow) => `${o.first_name} ${o.last_name}${o.callsign ? ` (${o.callsign})` : ''}`;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(234,179,8,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(234,179,8,0.20)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)' }}>
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">FTO Tracking</h1>
              <p className="text-slate-500 text-sm">Field Training Officer shift hours log</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#b45309,#d97706)', border: '1px solid rgba(234,179,8,0.30)', boxShadow: '0 0 16px rgba(234,179,8,0.15)' }}>
            <Plus className="w-4 h-4" /> Log FTO Shift
          </button>
        </div>
      </div>

      {/* FTO Summary cards */}
      {ftoStats.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ftoStats.map(f => (
            <div key={f.fto} className="glass rounded-xl p-4" style={{ borderColor: 'rgba(234,179,8,0.15)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{f.fto}</p>
                  <p className="text-xs text-slate-500 mt-0.5">FTO · {f.recruits.length} recruit{f.recruits.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(234,179,8,0.10)' }}>
                  <Award className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ l: 'Hours', v: `${f.totalHours}h`, icon: Clock }, { l: 'Sessions', v: f.sessions, icon: TrendingUp }, { l: 'Recruits', v: f.recruits.length, icon: Users }].map(s => (
                  <div key={s.l} className="rounded-lg p-2 text-center" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.08)' }}>
                    <s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-yellow-400" />
                    <div className="text-base font-bold text-white">{s.v}</div>
                    <div className="text-[10px] text-slate-500">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h2 className="font-bold text-white">Log FTO Shift</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">FTO Officer</label>
                  <select required value={form.fto_name} onChange={e => setForm(p => ({ ...p, fto_name: e.target.value }))}
                    className="nx-input" style={{ colorScheme: 'dark' }}>
                    <option value="">Select FTO…</option>
                    {officers.map(o => <option key={o.id} value={officerName(o)}>{officerName(o)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Recruit</label>
                  <select required value={form.recruit_name} onChange={e => setForm(p => ({ ...p, recruit_name: e.target.value }))}
                    className="nx-input" style={{ colorScheme: 'dark' }}>
                    <option value="">Select Recruit…</option>
                    {officers.map(o => <option key={o.id} value={officerName(o)}>{officerName(o)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Date</label>
                  <input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="nx-input" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Hours</label>
                  <input required type="number" min="0.5" max="16" step="0.5" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} className="nx-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="nx-input" style={{ colorScheme: 'dark' }}>
                    {SHIFT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Shift summary, observations, etc." className="nx-input resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Logging…' : 'Log Shift'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift log table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
          <span className="font-semibold text-white">Shift Log</span>
          <span className="chip chip-blue">{shifts.length} entries</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading…</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No FTO shifts logged yet. Log the first one above.</div>
        ) : (
          <div className="nx-table-wrap"><table className="nx-table">
            <thead>
              <tr><th>Date</th><th>FTO</th><th>Recruit</th><th>Type</th><th>Hours</th><th>Notes</th>{isLeadership && <th />}</tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id}>
                  <td className="mono text-xs">{format(new Date(s.date), 'dd MMM yyyy')}</td>
                  <td className="text-purple-400 font-medium">{s.fto_name}</td>
                  <td>{s.recruit_name}</td>
                  <td><span className="chip chip-blue">{s.type}</span></td>
                  <td className="font-bold text-yellow-400">{s.hours}h</td>
                  <td className="text-slate-500 max-w-[200px] truncate">{s.notes || '—'}</td>
                  {isLeadership && (
                    <td>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
