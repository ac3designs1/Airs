import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap, CheckCircle, Clock, Search, Users,
  ChevronRight, X, Shield, AlertCircle, Zap
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const LEADERSHIP = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

interface Recruit {
  id: string; first_name: string; last_name: string;
  callsign?: string; discord_username?: string;
  rank: string; department: string; created_at: string;
  onboarding_complete: number; onboarding_activated_by?: string;
}
interface ChecklistItem {
  id: string; name: string; desc: string;
  status: 'not_started' | 'in_progress' | 'completed';
  notes?: string; updated_by_name?: string; completed_at?: string;
}
interface Progress {
  officer: Recruit; items: ChecklistItem[];
  completedCount: number; total: number;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  completed:   { label: 'Done',        cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
  in_progress: { label: 'In Progress', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
  not_started: { label: 'Pending',     cls: 'text-slate-500 bg-slate-800/60 border-slate-700/50' },
};

export default function AcademyOnboarding() {
  const { auth } = useAuth();
  if (!LEADERSHIP.includes(auth.user?.role ?? '')) return <Navigate to="/dashboard" replace />;

  const [recruits, setRecruits]   = useState<Recruit[]>([]);
  const [selected, setSelected]   = useState<Recruit | null>(null);
  const [progress, setProgress]   = useState<Progress | null>(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [noteFor, setNoteFor]     = useState<string | null>(null);
  const [noteText, setNoteText]   = useState('');
  const [filter, setFilter]       = useState<'all' | 'training' | 'done'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/onboarding');
      setRecruits(r.data);
    } catch { toast.error('Failed to load recruits'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadProgress = useCallback(async (recruit: Recruit) => {
    setSelected(recruit);
    setProgress(null);
    try {
      const r = await api.get(`/onboarding/${recruit.id}`);
      setProgress(r.data);
    } catch { toast.error('Failed to load progress'); }
  }, []);

  const toggleItem = async (item: ChecklistItem) => {
    if (!selected || !progress) return;
    const newStatus = item.status === 'completed' ? 'not_started' : 'completed';
    setSaving(item.id);
    try {
      await api.put(`/onboarding/${selected.id}/item`, {
        stage_id: item.id, status: newStatus,
        notes: item.id === noteFor ? noteText : item.notes,
      });
      setProgress(p => p ? {
        ...p,
        completedCount: p.items.filter(i => (i.id === item.id ? newStatus : i.status) === 'completed').length,
        items: p.items.map(i => i.id === item.id
          ? { ...i, status: newStatus, updated_by_name: `${auth.user?.first_name} ${auth.user?.last_name}`, completed_at: new Date().toISOString() }
          : i),
      } : p);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(null); }
  };

  const saveNote = async (item: ChecklistItem) => {
    if (!selected) return;
    setSaving(item.id);
    try {
      await api.put(`/onboarding/${selected.id}/item`, {
        stage_id: item.id, status: item.status, notes: noteText,
      });
      setProgress(p => p ? {
        ...p,
        items: p.items.map(i => i.id === item.id ? { ...i, notes: noteText } : i),
      } : p);
      setNoteFor(null);
      toast.success('Note saved');
    } catch { toast.error('Failed to save note'); }
    finally { setSaving(null); }
  };

  const activateOfficer = async () => {
    if (!selected) return;
    setSaving('activate');
    try {
      await api.post(`/onboarding/${selected.id}/activate`);
      setRecruits(prev => prev.map(r => r.id === selected.id ? { ...r, onboarding_complete: 1, onboarding_activated_by: `${auth.user?.first_name} ${auth.user?.last_name}` } : r));
      setSelected(prev => prev ? { ...prev, onboarding_complete: 1 } : prev);
      toast.success(`${selected.first_name} ${selected.last_name} activated! They now have full MDT access.`);
    } catch { toast.error('Failed to activate'); }
    finally { setSaving(null); }
  };

  const filtered = recruits.filter(r => {
    const name = `${r.first_name} ${r.last_name} ${r.discord_username ?? ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'training' && !r.onboarding_complete) || (filter === 'done' && r.onboarding_complete);
    return matchSearch && matchFilter;
  });

  const pct = progress ? Math.round((progress.completedCount / progress.total) * 100) : 0;
  const allDone = progress ? progress.completedCount === progress.total : false;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(14,165,233,0.20)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.30)' }}>
            <GraduationCap className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Academy Onboarding
              <span className="chip chip-blue text-[10px]">LEADERSHIP</span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {recruits.filter(r => !r.onboarding_complete).length} in training ·{' '}
              {recruits.filter(r => r.onboarding_complete).length} activated
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        {/* Left: recruit list */}
        <div className="space-y-3">
          {/* Search + filter */}
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search recruits…"
                className="nx-input pl-9 text-sm" />
            </div>
            <div className="flex gap-1">
              {(['all', 'training', 'done'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={filter === f ? { background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="glass rounded-xl p-8 text-center">
              <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-500 text-sm">No recruits found</p>
            </div>
          ) : filtered.map(r => (
            <button key={r.id} onClick={() => loadProgress(r)}
              className={`w-full glass rounded-xl p-4 text-left transition-all hover:border-sky-500/25 ${selected?.id === r.id ? 'border-sky-500/30' : ''}`}
              style={selected?.id === r.id ? { borderColor: 'rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.05)' } : {}}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: r.onboarding_complete ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                    {r.first_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-slate-500 truncate">{r.discord_username ? `@${r.discord_username}` : r.callsign || r.rank}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.onboarding_complete
                    ? <span className="chip text-[10px] text-green-400 bg-green-500/10 border-green-500/20">Active</span>
                    : <span className="chip text-[10px] text-amber-400 bg-amber-500/10 border-amber-500/20">Training</span>
                  }
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </div>
              <p className="text-[10px] text-slate-700 mt-1.5">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
            </button>
          ))}
        </div>

        {/* Right: checklist detail */}
        {!selected ? (
          <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <GraduationCap className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-slate-500 font-semibold">Select a recruit</p>
            <p className="text-slate-600 text-sm mt-1">Click a recruit on the left to manage their training checklist.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recruit header */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white"
                    style={{ background: selected.onboarding_complete ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                    {selected.first_name[0]}
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">{selected.first_name} {selected.last_name}</h2>
                    <p className="text-slate-500 text-sm">{selected.rank} · {selected.department}
                      {selected.discord_username && <span className="text-indigo-400 ml-2">@{selected.discord_username}</span>}
                    </p>
                  </div>
                </div>
                {/* Activate button */}
                {!selected.onboarding_complete && (
                  <button onClick={activateOfficer} disabled={saving === 'activate' || !allDone}
                    title={!allDone ? 'Complete all checklist items first' : 'Activate officer'}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      allDone ? 'text-white hover:scale-[1.02]' : 'text-slate-600 cursor-not-allowed'
                    }`}
                    style={{
                      background: allDone ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${allDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: allDone ? '0 0 20px rgba(34,197,94,0.25)' : 'none',
                    }}>
                    {saving === 'activate'
                      ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : <><Zap className="w-4 h-4" /> Activate Officer</>}
                  </button>
                )}
                {selected.onboarding_complete && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-semibold">Activated</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              {progress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Training progress</span>
                    <span className="text-xs font-bold" style={{ color: pct === 100 ? '#22c55e' : '#0ea5e9' }}>
                      {progress.completedCount}/{progress.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#0284c7,#6366f1)',
                      }} />
                  </div>
                  {!allDone && (
                    <p className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Complete all items to unlock "Activate Officer"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            {!progress ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mx-auto mb-2" />
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Training Checklist</h3>
                  <span className="text-xs text-slate-500">Click items to mark complete</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {progress.items.map(item => {
                    const done = item.status === 'completed';
                    const s = STATUS_STYLE[item.status];
                    return (
                      <div key={item.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Toggle checkbox */}
                          <button onClick={() => toggleItem(item)} disabled={saving === item.id || !!selected.onboarding_complete}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${done ? 'bg-green-500/20 border border-green-500/40 hover:bg-green-500/30' : 'bg-slate-800 border border-slate-600 hover:border-sky-500/50'} ${selected.onboarding_complete ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                            {saving === item.id
                              ? <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                              : done ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : null}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className={`text-sm font-semibold ${done ? 'line-through text-slate-500' : 'text-white'}`}>{item.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                            {done && item.updated_by_name && (
                              <p className="text-[11px] text-green-600 mt-1">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Signed off by {item.updated_by_name}
                                {item.completed_at && ` · ${formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}`}
                              </p>
                            )}
                            {/* Note */}
                            {noteFor === item.id ? (
                              <div className="mt-2 flex items-end gap-2">
                                <input value={noteText} onChange={e => setNoteText(e.target.value)}
                                  placeholder="Add a note…" className="nx-input text-xs flex-1" />
                                <button onClick={() => saveNote(item)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors">
                                  Save
                                </button>
                                <button onClick={() => setNoteFor(null)} className="p-1.5 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <div className="mt-1.5 flex items-center gap-3">
                                {item.notes && <span className="text-[11px] text-slate-500 italic">"{item.notes}"</span>}
                                {!selected.onboarding_complete && (
                                  <button onClick={() => { setNoteFor(item.id); setNoteText(item.notes ?? ''); }}
                                    className="text-[11px] text-slate-600 hover:text-sky-400 transition-colors">
                                    {item.notes ? 'Edit note' : '+ Add note'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Shield icon for locked items */}
                          {!done && <Shield className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 mt-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
