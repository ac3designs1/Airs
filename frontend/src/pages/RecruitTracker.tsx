import { useEffect, useState } from 'react';
import {
  Users, Search, CheckCircle2, Clock, XCircle, PlayCircle,
  BarChart2, TrendingUp, MessageSquare, X, UserCheck, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import api from '../api/client';

/* ── Types ── */
type Status = 'not_started' | 'in_progress' | 'completed' | 'failed';
interface Requirement { id: string; name: string; desc: string; stageId: number }
interface ReqProgress { status: Status; completed_by?: string; completed_at?: string; notes?: string }
interface Recruit { id: string; first_name: string; last_name: string; rank: string; callsign: string; department: string }
type ProgressMap = Record<string, Record<string, ReqProgress>>;

/* ── Stages ── */
const STAGES = [
  { id: 1, label: 'Level One',   short: 'L1', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.22)',
    requirements: [
      { id: 's1-1', name: 'Attending Jobs',   desc: 'Show competency in responding to and handling various job types', stageId: 1 },
      { id: 's1-2', name: 'Priority Levels',  desc: 'Understand and correctly apply different priority response levels', stageId: 1 },
      { id: 's1-3', name: 'Radio COMMS',       desc: 'Display proper radio communication protocols and etiquette', stageId: 1 },
      { id: 's1-4', name: 'Use Of MDT & CAD', desc: 'Demonstrate proficiency in using the MDT and CAD systems', stageId: 1 },
    ]},
  { id: 2, label: 'Level Two',   short: 'L2', color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.22)',
    requirements: [
      { id: 's2-1', name: 'Arrest Reports & Custody', desc: 'Properly handle arrests and complete accurate custody reports', stageId: 2 },
      { id: 's2-2', name: 'Community Service',         desc: 'Understand the usage of community service actions', stageId: 2 },
      { id: 's2-3', name: 'FPO',                       desc: 'Understand the use of Firearm Prohibition Orders', stageId: 2 },
      { id: 's2-4', name: 'Warrant Reports',           desc: 'Demonstrate ability to properly write and manage warrant reports', stageId: 2 },
    ]},
  { id: 3, label: 'Level Three', short: 'L3', color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)',
    requirements: [
      { id: 's3-1', name: 'Code 4',              desc: 'Understand how to complete a traffic stop', stageId: 3 },
      { id: 's3-2', name: 'Pursuit Initiations', desc: 'Show competency in initiating and managing vehicle pursuits', stageId: 3 },
      { id: 's3-3', name: 'Vehicle Control',     desc: 'Demonstrate proper vehicle control and driving techniques', stageId: 3 },
      { id: 's3-4', name: 'Vehicle Impounds',    desc: 'Properly handle vehicle impounds and related paperwork', stageId: 3 },
    ]},
  { id: 4, label: 'Level Four',  short: 'L4', color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.22)',
    requirements: [
      { id: 's4-1', name: 'Basic Breach Rundown', desc: 'Display understanding of basic breach procedures and protocols', stageId: 4 },
      { id: 's4-2', name: 'Code 15',              desc: 'Show proficiency in Code 15 situations and procedures', stageId: 4 },
      { id: 's4-3', name: 'First Aid',            desc: 'Display competency in providing emergency medical assistance', stageId: 4 },
      { id: 's4-4', name: 'Use Of Force',         desc: 'Demonstrate appropriate use of force and escalation procedures', stageId: 4 },
    ]},
] as const;

const ALL_REQS: Requirement[] = STAGES.flatMap(s => s.requirements as unknown as Requirement[]);
const TOTAL = ALL_REQS.length;

function done(rid: string, stageId: number, pm: ProgressMap) {
  return ALL_REQS.filter(r => r.stageId === stageId && pm[rid]?.[r.id]?.status === 'completed').length;
}
function totalDone(rid: string, pm: ProgressMap) {
  return ALL_REQS.filter(r => pm[rid]?.[r.id]?.status === 'completed').length;
}

function emptyProgress(list: Recruit[]): ProgressMap {
  const m: ProgressMap = {};
  list.forEach(r => { m[r.id] = {}; });
  return m;
}

function applyApiProgress(officerId: string, apiMap: Record<string, { status: string; notes?: string; updated_by_name?: string; completed_at?: string }>, pm: ProgressMap): ProgressMap {
  const updated = { ...pm, [officerId]: { ...(pm[officerId] ?? {}) } };
  Object.entries(apiMap).forEach(([stageId, row]) => {
    updated[officerId][stageId] = {
      status: row.status as Status,
      notes: row.notes ?? undefined,
      completed_by: row.updated_by_name ?? undefined,
      completed_at: row.completed_at ?? undefined,
    };
  });
  return updated;
}

const EDITABLE_ROLES = ['admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', failed: 'Failed',
};
const STATUS_CLS: Record<Status, string> = {
  not_started: 'text-slate-400 bg-slate-800/80 border-slate-700',
  in_progress: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  completed:   'text-green-400 bg-green-500/10 border-green-500/30',
  failed:      'text-red-400 bg-red-500/10 border-red-500/30',
};

/* ─── Component ─── */
export default function RecruitTracker() {
  const { auth } = useAuth();
  const byName = `${auth.user?.first_name ?? ''} ${auth.user?.last_name ?? ''}`.trim();
  const canEdit = EDITABLE_ROLES.includes(auth.user?.role ?? '');

  const [recruits,      setRecruits]      = useState<Recruit[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [incomplete,    setIncomplete]    = useState(false);
  const [selected,      setSelected]      = useState<Recruit | null>(null);
  const [progress,      setProgress]      = useState<ProgressMap>({});
  const [activeStage,   setActiveStage]   = useState(1);
  const [noteModal,     setNoteModal]     = useState<{ rid: string; reqId: string } | null>(null);
  const [noteText,      setNoteText]      = useState('');
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    api.get('/roster').then(r => {
      const list: Recruit[] = (r.data as (Recruit & { role: string })[]).filter(o => o.role === 'recruit');
      setRecruits(list);
      setProgress(emptyProgress(list));
      if (list.length) setSelected(list[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Load progress from backend whenever selected recruit changes
  useEffect(() => {
    if (!selected) return;
    api.get(`/recruit-progress/${selected.id}`)
      .then(r => setProgress(prev => applyApiProgress(selected.id, r.data.progress, prev)))
      .catch(() => {});
  }, [selected?.id]);

  const filtered = recruits.filter(r => {
    const q = search.toLowerCase();
    return (!q || `${r.first_name} ${r.last_name} ${r.callsign ?? ''}`.toLowerCase().includes(q))
      && (!incomplete || totalDone(r.id, progress) < TOTAL);
  });

  const avgPct  = recruits.length ? Math.round(recruits.reduce((s, r) => s + totalDone(r.id, progress), 0) / recruits.length / TOTAL * 100) : 0;
  const totalHrs = recruits.reduce((s, r) => s + totalDone(r.id, progress) * 3, 0);

  async function setStatus(rid: string, reqId: string, status: Status) {
    // Optimistic update
    setProgress(p => ({
      ...p,
      [rid]: {
        ...p[rid],
        [reqId]: {
          ...(p[rid]?.[reqId] ?? {}),
          status,
          ...(status === 'completed' ? { completed_by: byName, completed_at: new Date().toISOString() } : {}),
        },
      },
    }));
    // Persist to backend
    const req = ALL_REQS.find(r => r.id === reqId);
    try {
      const res = await api.post('/recruit-progress', {
        officer_id: rid, stage_id: reqId, stage_name: req?.name ?? reqId, status,
        notes: progress[rid]?.[reqId]?.notes ?? null,
      });
      setProgress(prev => ({
        ...prev,
        [rid]: {
          ...prev[rid],
          [reqId]: {
            status: res.data.status as Status,
            notes: res.data.notes ?? undefined,
            completed_by: res.data.updated_by_name ?? undefined,
            completed_at: res.data.completed_at ?? undefined,
          },
        },
      }));
    } catch { /* optimistic update stays */ }
  }

  async function saveNote() {
    if (!noteModal) return;
    const { rid, reqId } = noteModal;
    const currentStatus = progress[rid]?.[reqId]?.status ?? 'not_started';
    const req = ALL_REQS.find(r => r.id === reqId);
    setSaving(true);
    try {
      const res = await api.post('/recruit-progress', {
        officer_id: rid, stage_id: reqId, stage_name: req?.name ?? reqId,
        status: currentStatus, notes: noteText,
      });
      setProgress(prev => ({
        ...prev,
        [rid]: {
          ...prev[rid],
          [reqId]: {
            status: res.data.status as Status,
            notes: res.data.notes ?? undefined,
            completed_by: res.data.updated_by_name ?? undefined,
            completed_at: res.data.completed_at ?? undefined,
          },
        },
      }));
    } catch {
      // fallback: local only
      setProgress(p => ({ ...p, [rid]: { ...p[rid], [reqId]: { ...p[rid]?.[reqId], notes: noteText } } }));
    } finally { setSaving(false); }
    setNoteModal(null); setNoteText('');
  }

  const stage = STAGES.find(s => s.id === activeStage)!;
  const stageReqs = stage.requirements as unknown as Requirement[];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(14,165,233,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
            <UserCheck className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Recruit Tracker</h1>
            <p className="text-slate-500 text-sm">Track and manage recruit training progress through all levels</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Recruits', value: recruits.length, sub: 'Active training',     icon: Users,        color: 'text-sky-400' },
          { label: 'Avg Progress',   value: `${avgPct}%`,    sub: 'Training completion', icon: TrendingUp,   color: 'text-green-400' },
          { label: 'Total Hours',    value: `${totalHrs}h`,  sub: 'All recruits combined',icon: BarChart2,   color: 'text-sky-400' },
          { label: 'Recruit Viewing',value: selected ? 1 : 0,sub: 'Currently selected',  icon: UserCheck,   color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4" style={{ minHeight: 560 }}>

        {/* ── Left: member list ── */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-2">
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">CIRT Members</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none"
                style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(14,165,233,0.10)' }} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 hover:text-slate-300 select-none">
              <input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} className="w-3.5 h-3.5 accent-sky-500" />
              Show only incomplete
            </label>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-10 text-slate-600 text-sm">Loading…</div>
            ) : recruits.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center space-y-1">
                <UserCheck className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs text-slate-500 font-semibold">No recruits</p>
                <p className="text-[10px] text-slate-600 leading-snug">Assign the <span className="text-sky-400 font-mono">recruit</span> role via User Management</p>
              </div>
            ) : filtered.map(r => {
              const d = totalDone(r.id, progress);
              const full = d === TOTAL;
              const sel  = selected?.id === r.id;
              return (
                <button key={r.id} onClick={() => setSelected(r)}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all group"
                  style={{ background: sel ? 'rgba(14,165,233,0.12)' : 'rgba(15,23,42,0.5)', border: `1px solid ${sel ? 'rgba(14,165,233,0.35)' : 'rgba(14,165,233,0.06)'}` }}>
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                    {r.first_name[0]}{r.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{r.first_name} {r.last_name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{r.rank}</div>
                  </div>
                  {full
                    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-green-400 bg-green-500/10 border border-green-500/25 flex-shrink-0">Complete</span>
                    : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{ color: '#fcd34d', background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.22)' }}>
                        {d}/{TOTAL}
                      </span>
                  }
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: requirements panel ── */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center">
              <div className="text-center text-slate-600">
                <UserCheck className="w-14 h-14 mx-auto mb-3 opacity-15" />
                <p className="text-sm">Select a recruit to view their progress</p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden flex flex-col h-full">

              {/* Recruit banner */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                    {selected.first_name[0]}{selected.last_name[0]}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{selected.first_name} {selected.last_name}</h2>
                    <p className="text-xs text-slate-500">{selected.rank}{selected.callsign ? ` · ${selected.callsign}` : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-sky-400">{totalDone(selected.id, progress)}</span>
                  <span className="text-slate-600 text-lg">/{TOTAL}</span>
                  <div className="text-[10px] text-slate-600">Completed</div>
                </div>
              </div>

              {/* Level tabs */}
              <div className="flex px-4 pt-4 pb-0 gap-1 flex-wrap">
                {STAGES.map(s => {
                  const d = done(selected.id, s.id, progress);
                  const tot = s.requirements.length;
                  const active = activeStage === s.id;
                  return (
                    <button key={s.id} onClick={() => setActiveStage(s.id)}
                      className="flex flex-col items-start px-4 py-2.5 rounded-t-xl transition-all min-w-[110px]"
                      style={{
                        background: active ? 'rgba(15,23,42,0.9)' : 'rgba(15,23,42,0.4)',
                        border: `1px solid ${active ? s.border : 'rgba(14,165,233,0.06)'}`,
                        borderBottom: active ? '1px solid transparent' : undefined,
                      }}>
                      <span className="text-xs font-bold" style={{ color: active ? s.color : '#64748b' }}>{s.label}</span>
                      <span className="text-[10px] text-slate-500">{d}/{tot}</span>
                      <div className="mt-1.5 w-full h-0.5 rounded-full overflow-hidden bg-slate-800">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(d / tot * 100)}%`, background: s.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Requirements table */}
              <div className="flex-1 overflow-y-auto" style={{ borderTop: `1px solid ${stage.border}` }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                      {['REQUIREMENT', 'LEVEL', 'STATUS', 'COMPLETED BY', 'ACTIONS'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stageReqs.map((req, i) => {
                      const prog = progress[selected.id]?.[req.id] ?? { status: 'not_started' as Status };
                      const statusCls = STATUS_CLS[prog.status];
                      const StatusIcon = prog.status === 'completed' ? CheckCircle2
                        : prog.status === 'in_progress' ? PlayCircle
                        : prog.status === 'failed' ? XCircle : Clock;
                      return (
                        <tr key={req.id}
                          className="transition-colors hover:bg-slate-800/20"
                          style={{ borderBottom: i < stageReqs.length - 1 ? '1px solid rgba(14,165,233,0.06)' : 'none' }}>

                          {/* Requirement */}
                          <td className="px-4 py-3.5 min-w-[200px]">
                            <div className="font-semibold text-white text-sm">{req.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{req.desc}</div>
                            {prog.notes && <div className="text-[10px] text-amber-400/70 mt-1 italic">&ldquo;{prog.notes}&rdquo;</div>}
                          </td>

                          {/* Level badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                              style={{ color: stage.color, background: stage.bg, border: `1px solid ${stage.border}` }}>
                              {stage.label}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${statusCls}`}>
                              <StatusIcon className="w-3 h-3" />
                              {STATUS_LABEL[prog.status]}
                            </span>
                          </td>

                          {/* Completed by */}
                          <td className="px-4 py-3.5 min-w-[130px]">
                            {prog.completed_by ? (
                              <div>
                                <div className="text-xs text-white font-medium">{prog.completed_by}</div>
                                {prog.completed_at && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {format(new Date(prog.completed_at), 'd MMM yyyy, h:mm aa')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-700 text-xs">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <>
                                  {prog.status === 'not_started' && (
                                    <button onClick={() => setStatus(selected.id, req.id, 'in_progress')}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-sky-400 transition-colors"
                                      style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}>
                                      Start
                                    </button>
                                  )}
                                  {prog.status === 'in_progress' && (
                                    <>
                                      <button onClick={() => setStatus(selected.id, req.id, 'completed')}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-green-400 transition-colors"
                                        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                                        Mark Passed
                                      </button>
                                      <button onClick={() => setStatus(selected.id, req.id, 'failed')}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 transition-colors"
                                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                        Mark Failed
                                      </button>
                                    </>
                                  )}
                                  {prog.status === 'completed' && (
                                    <button onClick={() => setStatus(selected.id, req.id, 'failed')}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 transition-colors"
                                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                      Mark Failed
                                    </button>
                                  )}
                                  {prog.status === 'failed' && (
                                    <button onClick={() => setStatus(selected.id, req.id, 'not_started')}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 transition-colors"
                                      style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                                      Reset
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                onClick={() => { setNoteModal({ rid: selected.id, reqId: req.id }); setNoteText(prog.notes ?? ''); }}
                                className={`p-1.5 rounded-lg transition-colors ${prog.notes ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                                style={{ background: prog.notes ? 'rgba(245,158,11,0.10)' : 'rgba(14,165,233,0.06)', border: `1px solid ${prog.notes ? 'rgba(245,158,11,0.20)' : 'rgba(14,165,233,0.08)'}` }}>
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0a1020', border: '1px solid rgba(14,165,233,0.18)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
              <h3 className="font-bold text-white text-sm">Add Note</h3>
              <button onClick={() => setNoteModal(null)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Enter note for this requirement..."
                className="nx-input resize-none text-sm w-full" />
              <div className="flex gap-2">
                <button onClick={() => setNoteModal(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                <button onClick={saveNote} disabled={saving} className="btn-primary flex-1 py-2 text-sm">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
