import { useEffect, useState } from 'react';
import { UserCheck, CheckCircle, Clock, X, Plus, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface StageStatus { name: string; status: 'complete' | 'current' | 'pending'; date?: string; notes?: string; }
interface RecruitRecord {
  id: string; recruit_officer_id: string; recruit_name: string; callsign: string;
  fto_name: string; stage_index: number; stage_statuses: StageStatus[]; updated_at: string;
}
interface OfficerRow { id: string; first_name: string; last_name: string; callsign?: string; }

const STAGES_DEF = ['Orientation','Traffic Enforcement','Criminal Law','Report Writing','Field Evaluation','Final Sign-Off'];

function buildInitialStatuses(): StageStatus[] {
  return STAGES_DEF.map((name, i) => ({ name, status: i === 0 ? 'current' : 'pending' }));
}

const stageColor = (s: string) => s === 'complete' ? 'text-green-400' : s === 'current' ? 'text-purple-400' : 'text-slate-600';
const stageBg = (s: string) => s === 'complete' ? 'border-green-500/25 bg-green-500/05' : s === 'current' ? 'border-purple-500/25 bg-purple-500/05' : 'border-slate-800/80';

const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];
const EMPTY_FORM = { officer_id: '', fto_name: '' };

export default function RecruitTraining() {
  const { auth } = useAuth();
  const canEdit = LEADERSHIP.includes(auth.user?.role ?? '');

  const [records,   setRecords]   = useState<RecruitRecord[]>([]);
  const [officers,  setOfficers]  = useState<OfficerRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);

  useEffect(() => {
    Promise.all([
      api.get('/recruit-stages'),
      api.get('/roster'),
    ]).then(([r, o]) => {
      setRecords(r.data);
      const recruits = (o.data as (OfficerRow & { role: string })[]).filter(x => x.role === 'recruit');
      setOfficers(recruits);
      if (r.data.length) setExpanded(r.data[0].recruit_officer_id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function addRecruit(e: React.FormEvent) {
    e.preventDefault();
    const o = officers.find(x => x.id === form.officer_id);
    if (!o) return toast.error('Select a recruit');
    setSaving(true);
    try {
      const res = await api.post('/recruit-stages', {
        recruit_officer_id: o.id,
        recruit_name: `${o.first_name} ${o.last_name}`,
        callsign: o.callsign ?? '',
        fto_name: form.fto_name,
        stage_index: 0,
        stage_statuses: buildInitialStatuses(),
      });
      setRecords(prev => [res.data, ...prev]);
      setExpanded(res.data.recruit_officer_id);
      setShowAdd(false); setForm(EMPTY_FORM);
      toast.success('Recruit added to training');
    } catch { toast.error('Failed to add recruit'); }
    finally { setSaving(false); }
  }

  async function advance(rec: RecruitRecord) {
    const next = rec.stage_index + 1;
    if (next >= STAGES_DEF.length) return;
    const updated = rec.stage_statuses.map((s, i): StageStatus =>
      i === rec.stage_index ? { ...s, status: 'complete', date: new Date().toISOString().split('T')[0] }
      : i === next ? { ...s, status: 'current' }
      : s
    );
    try {
      const res = await api.post('/recruit-stages', { ...rec, stage_index: next, stage_statuses: updated });
      setRecords(prev => prev.map(r => r.recruit_officer_id === rec.recruit_officer_id ? res.data : r));
      toast.success('Stage advanced');
    } catch { toast.error('Failed to advance stage'); }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.10),rgba(168,85,247,0.06))', border: '1px solid rgba(34,197,94,0.18)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <UserCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Recruit Training</h1>
              <p className="text-slate-500 text-sm">FTO-guided stage progression for active recruits</p>
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Recruit
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In Training', value: records.length, color: 'text-purple-400' },
          { label: 'Completed',   value: records.filter(r => r.stage_index >= STAGES_DEF.length - 1 && r.stage_statuses.every(s => s.status === 'complete')).length, color: 'text-green-400' },
          { label: 'In Progress', value: records.filter(r => r.stage_index < STAGES_DEF.length - 1).length, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add recruit modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h2 className="font-bold text-white">Add Recruit to Training</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={addRecruit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Recruit</label>
                <select required value={form.officer_id} onChange={e => setForm(p => ({ ...p, officer_id: e.target.value }))} className="nx-input" style={{ colorScheme: 'dark' }}>
                  <option value="">Select recruit from roster…</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}{o.callsign ? ` (${o.callsign})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Assigned FTO</label>
                <input value={form.fto_name} onChange={e => setForm(p => ({ ...p, fto_name: e.target.value }))} placeholder="FTO Name (Callsign)" className="nx-input" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recruit list */}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-slate-600">Loading recruits…</div>
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500">No recruits in training yet.</p>
          {canEdit && <p className="text-slate-600 text-sm mt-1">Add recruits using the button above.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const isOpen = expanded === rec.recruit_officer_id;
            const done = rec.stage_statuses.filter(s => s.status === 'complete').length;
            const pct = Math.round(done / STAGES_DEF.length * 100);
            const currentStage = rec.stage_statuses[rec.stage_index];
            return (
              <div key={rec.recruit_officer_id} className="glass rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : rec.recruit_officer_id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#059669,#a855f7)' }}>
                    {rec.recruit_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{rec.recruit_name}</span>
                      {rec.callsign && <span className="text-xs text-purple-400 font-mono">{rec.callsign}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 max-w-[140px]">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{done}/{STAGES_DEF.length} stages · {pct}%</span>
                      {rec.fto_name && <span className="text-xs text-slate-600">FTO: {rec.fto_name}</span>}
                    </div>
                  </div>
                  {currentStage && (
                    <span className="chip chip-blue hidden sm:inline-flex">{currentStage.name}</span>
                  )}
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(168,85,247,0.06)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                      {rec.stage_statuses.map((s, i) => {
                        const Icon = s.status === 'complete' ? CheckCircle : s.status === 'current' ? Clock : X;
                        return (
                          <div key={s.name} className={`rounded-xl p-3 border ${stageBg(s.status)}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={`w-4 h-4 flex-shrink-0 ${stageColor(s.status)}`} />
                              <span className={`text-sm font-semibold ${stageColor(s.status)}`}>{s.name}</span>
                            </div>
                            {s.date && <div className="text-xs text-slate-600">{format(new Date(s.date), 'dd MMM yyyy')}</div>}
                            {s.notes && <div className="text-xs text-slate-500 mt-1 italic">{s.notes}</div>}
                          </div>
                        );
                      })}
                    </div>
                    {canEdit && rec.stage_index < STAGES_DEF.length - 1 && (
                      <div className="flex justify-end pt-2">
                        <button onClick={() => advance(rec)} className="btn-primary text-sm px-5 py-2 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" /> Advance to Next Stage
                        </button>
                      </div>
                    )}
                    {rec.stage_index >= STAGES_DEF.length - 1 && rec.stage_statuses.every(s => s.status === 'complete') && (
                      <div className="text-center pt-2">
                        <span className="chip chip-green text-sm">🎉 All stages complete — ready for promotion</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
