import { useEffect, useState } from 'react';
import {
  Users, Search, CheckCircle2, Clock, XCircle, PlayCircle,
  BarChart2, TrendingUp, MessageSquare, X, UserCheck, ChevronRight,
  CheckCircle, Plus, GraduationCap, Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import api from '../api/client';
import toast from 'react-hot-toast';

/* ── Shared types ─────────────────────────────────────────────── */
type Status = 'not_started' | 'in_progress' | 'completed' | 'failed';
interface Recruit { id: string; first_name: string; last_name: string; rank: string; callsign: string; department: string }
type ProgressMap = Record<string, Record<string, ReqProgress>>;
interface ReqProgress { status: Status; completed_by?: string; completed_at?: string; notes?: string }
interface Requirement { id: string; name: string; desc: string; stageId: number }

/* ── Skill Requirements data ──────────────────────────────────── */
const SKILL_STAGES = [
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

const ALL_REQS: Requirement[] = SKILL_STAGES.flatMap(s => s.requirements as unknown as Requirement[]);
const TOTAL_REQS = ALL_REQS.length;

/* ── FTO Stage data ───────────────────────────────────────────── */
const FTO_STAGES_DEF = ['Orientation','Traffic Enforcement','Criminal Law','Report Writing','Field Evaluation','Final Sign-Off'];

interface StageStatus { name: string; status: 'complete' | 'current' | 'pending'; date?: string; notes?: string }
interface TrainingRecord {
  id: string; recruit_officer_id: string; recruit_name: string; callsign: string;
  fto_name: string; stage_index: number; stage_statuses: StageStatus[]; updated_at: string;
}

function buildInitialStatuses(): StageStatus[] {
  return FTO_STAGES_DEF.map((name, i) => ({ name, status: i === 0 ? 'current' : 'pending' }));
}

/* ── Helpers ──────────────────────────────────────────────────── */
function skillDone(rid: string, stageId: number, pm: ProgressMap) {
  return ALL_REQS.filter(r => r.stageId === stageId && pm[rid]?.[r.id]?.status === 'completed').length;
}
function skillTotalDone(rid: string, pm: ProgressMap) {
  return ALL_REQS.filter(r => pm[rid]?.[r.id]?.status === 'completed').length;
}

const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', failed: 'Failed',
};
const STATUS_CLS: Record<Status, string> = {
  not_started: 'text-slate-400 bg-slate-800/80 border-slate-700',
  in_progress:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  completed:    'text-green-400 bg-green-500/10 border-green-500/30',
  failed:       'text-red-400 bg-red-500/10 border-red-500/30',
};
const stageBg = (s: string) => s === 'complete' ? 'border-green-500/25 bg-green-500/5' : s === 'current' ? 'border-purple-500/25 bg-purple-500/5' : 'border-slate-800/80 bg-transparent';
const stageColor = (s: string) => s === 'complete' ? 'text-green-400' : s === 'current' ? 'text-purple-400' : 'text-slate-600';

const EDITABLE_ROLES = ['commissioner', 'commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

/* ─────────────────────────────────────────────────────────────── */
export default function RecruitTracker() {
  const { auth } = useAuth();
  const byName = `${auth.user?.first_name ?? ''} ${auth.user?.last_name ?? ''}`.trim();
  const canEdit = EDITABLE_ROLES.includes(auth.user?.role ?? '');

  /* Shared recruit list */
  const [recruits,    setRecruits]    = useState<Recruit[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]    = useState<Recruit | null>(null);

  /* Tab: 'skills' | 'stages' */
  const [tab, setTab] = useState<'skills' | 'stages'>('skills');

  /* ── Skill requirements state ─────────── */
  const [progress,    setProgress]    = useState<ProgressMap>({});
  const [activeSkillStage, setActiveSkillStage] = useState(1);
  const [noteModal,   setNoteModal]   = useState<{ rid: string; reqId: string } | null>(null);
  const [noteText,    setNoteText]    = useState('');
  const [savingNote,  setSavingNote]  = useState(false);

  /* ── FTO stage state ──────────────────── */
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [showAddFTO,      setShowAddFTO]      = useState(false);
  const [ftoForm,         setFtoForm]         = useState({ fto_name: '' });
  const [savingFTO,       setSavingFTO]       = useState(false);
  const [showSignOff,     setShowSignOff]     = useState(false);
  const [signingOff,      setSigningOff]      = useState(false);

  /* ── Load recruits ────────────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      api.get('/roster'),
      api.get('/recruit-stages'),
    ]).then(([rRes, trRes]) => {
      const list: Recruit[] = (rRes.data as (Recruit & { role: string })[]).filter(o => o.role === 'recruit');
      setRecruits(list);
      if (list.length) setSelected(list[0]);
      const initMap: ProgressMap = {};
      list.forEach(r => { initMap[r.id] = {}; });
      setProgress(initMap);
      setTrainingRecords(trRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  /* ── Load skill progress when recruit changes ─────────────────── */
  useEffect(() => {
    if (!selected) return;
    api.get(`/recruit-progress/${selected.id}`)
      .then(r => {
        const apiMap = r.data.progress as Record<string, { status: string; notes?: string; updated_by_name?: string; completed_at?: string }>;
        setProgress(prev => {
          const updated = { ...prev, [selected.id]: { ...(prev[selected.id] ?? {}) } };
          Object.entries(apiMap).forEach(([stageId, row]) => {
            updated[selected.id][stageId] = {
              status: row.status as Status,
              notes: row.notes ?? undefined,
              completed_by: row.updated_by_name ?? undefined,
              completed_at: row.completed_at ?? undefined,
            };
          });
          return updated;
        });
      }).catch(() => {});
  }, [selected?.id]);

  /* ── Skill actions ────────────────────────────────────────────── */
  async function setSkillStatus(rid: string, reqId: string, status: Status) {
    setProgress(p => ({
      ...p,
      [rid]: {
        ...p[rid],
        [reqId]: { ...(p[rid]?.[reqId] ?? {}), status,
          ...(status === 'completed' ? { completed_by: byName, completed_at: new Date().toISOString() } : {}) },
      },
    }));
    const req = ALL_REQS.find(r => r.id === reqId);
    try {
      const res = await api.post('/recruit-progress', {
        officer_id: rid, stage_id: reqId, stage_name: req?.name ?? reqId, status,
        notes: progress[rid]?.[reqId]?.notes ?? null,
      });
      setProgress(prev => ({
        ...prev, [rid]: { ...prev[rid], [reqId]: {
          status: res.data.status as Status,
          notes: res.data.notes ?? undefined,
          completed_by: res.data.updated_by_name ?? undefined,
          completed_at: res.data.completed_at ?? undefined,
        }},
      }));
    } catch {}
  }

  async function saveNote() {
    if (!noteModal) return;
    const { rid, reqId } = noteModal;
    const currentStatus = progress[rid]?.[reqId]?.status ?? 'not_started';
    const req = ALL_REQS.find(r => r.id === reqId);
    setSavingNote(true);
    try {
      const res = await api.post('/recruit-progress', {
        officer_id: rid, stage_id: reqId, stage_name: req?.name ?? reqId, status: currentStatus, notes: noteText,
      });
      setProgress(prev => ({
        ...prev, [rid]: { ...prev[rid], [reqId]: {
          status: res.data.status as Status,
          notes: res.data.notes ?? undefined,
          completed_by: res.data.updated_by_name ?? undefined,
          completed_at: res.data.completed_at ?? undefined,
        }},
      }));
    } catch {
      setProgress(p => ({ ...p, [rid]: { ...p[rid], [reqId]: { ...p[rid]?.[reqId], notes: noteText } } }));
    } finally { setSavingNote(false); }
    setNoteModal(null); setNoteText('');
  }

  /* ── FTO stage actions ────────────────────────────────────────── */
  const selectedTraining = selected ? trainingRecords.find(r => r.recruit_officer_id === selected.id) : null;

  async function addToFTO(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingFTO(true);
    try {
      const res = await api.post('/recruit-stages', {
        recruit_officer_id: selected.id,
        recruit_name: `${selected.first_name} ${selected.last_name}`,
        callsign: selected.callsign ?? '',
        fto_name: ftoForm.fto_name,
        stage_index: 0,
        stage_statuses: buildInitialStatuses(),
      });
      setTrainingRecords(prev => [...prev.filter(r => r.recruit_officer_id !== selected.id), res.data]);
      toast.success('Recruit added to FTO programme');
      setShowAddFTO(false); setFtoForm({ fto_name: '' });
    } catch { toast.error('Failed to add recruit'); }
    finally { setSavingFTO(false); }
  }

  async function advanceFTO() {
    if (!selectedTraining) return;
    const next = selectedTraining.stage_index + 1;
    if (next >= FTO_STAGES_DEF.length) return;
    const updated = selectedTraining.stage_statuses.map((s, i): StageStatus =>
      i === selectedTraining.stage_index ? { ...s, status: 'complete', date: new Date().toISOString().split('T')[0] }
      : i === next ? { ...s, status: 'current' }
      : s
    );
    try {
      const res = await api.post('/recruit-stages', { ...selectedTraining, stage_index: next, stage_statuses: updated });
      setTrainingRecords(prev => prev.map(r => r.recruit_officer_id === selectedTraining.recruit_officer_id ? res.data : r));
      toast.success('Stage advanced');
    } catch { toast.error('Failed to advance stage'); }
  }

  async function finalSignOff() {
    if (!selectedTraining || !selected) return;
    setSigningOff(true);
    try {
      await api.post(`/recruit-stages/${selected.id}/final-signoff`);
      // Mark all stages complete locally
      const completedStatuses = selectedTraining.stage_statuses.map(s => ({
        ...s, status: 'complete' as const,
        date: s.date || new Date().toISOString().split('T')[0],
      }));
      setTrainingRecords(prev => prev.map(r =>
        r.recruit_officer_id === selected.id
          ? { ...r, stage_statuses: completedStatuses, stage_index: FTO_STAGES_DEF.length - 1 }
          : r
      ));
      // Remove from recruit list — they're now Probationary Constable
      setRecruits(prev => prev.filter(r => r.id !== selected.id));
      setSelected(null);
      setShowSignOff(false);
      toast.success(`${selected.first_name} ${selected.last_name} has been promoted to Probationary Constable!`, { duration: 5000 });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to complete sign-off';
      toast.error(msg);
    } finally {
      setSigningOff(false);
    }
  }

  /* ── Derived ─────────────────────────────────────────────────── */
  const filtered = recruits.filter(r => {
    const q = search.toLowerCase();
    return !q || `${r.first_name} ${r.last_name} ${r.callsign ?? ''}`.toLowerCase().includes(q);
  });

  const stage = SKILL_STAGES.find(s => s.id === activeSkillStage)!;
  const stageReqs = stage.requirements as unknown as Requirement[];

  const avgPct = recruits.length
    ? Math.round(recruits.reduce((s, r) => s + skillTotalDone(r.id, progress), 0) / recruits.length / TOTAL_REQS * 100)
    : 0;
  const trainingComplete = trainingRecords.filter(r =>
    r.stage_index >= FTO_STAGES_DEF.length - 1 && r.stage_statuses.every(s => s.status === 'complete')
  ).length;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,197,94,0.06))', border: '1px solid rgba(168,85,247,0.18)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Recruit Management</h1>
              <p className="text-slate-500 text-sm">Skill requirements &amp; FTO stage progression in one place</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Recruits',  value: recruits.length,      icon: Users,        color: 'text-purple-400' },
          { label: 'Avg Skills',      value: `${avgPct}%`,          icon: BarChart2,    color: 'text-green-400' },
          { label: 'In FTO Programme',value: trainingRecords.length, icon: UserCheck,   color: 'text-purple-400' },
          { label: 'FTO Complete',    value: trainingComplete,       icon: TrendingUp,  color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4" style={{ minHeight: 580 }}>

        {/* ── Left: recruit list ── */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-2">
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Recruits</span>
              <span className="ml-auto text-[10px] text-slate-600 font-mono">{recruits.length} total</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recruits…"
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none"
                style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(168,85,247,0.10)' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-10 text-slate-600 text-sm">Loading…</div>
            ) : recruits.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center space-y-1">
                <UserCheck className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs text-slate-500 font-semibold">No recruits</p>
                <p className="text-[10px] text-slate-600 leading-snug">Assign the <span className="text-purple-400 font-mono">recruit</span> role via User Management</p>
              </div>
            ) : filtered.map(r => {
              const d = skillTotalDone(r.id, progress);
              const sel = selected?.id === r.id;
              const hasFTO = trainingRecords.some(tr => tr.recruit_officer_id === r.id);
              return (
                <button key={r.id} onClick={() => setSelected(r)}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all group"
                  style={{ background: sel ? 'rgba(168,85,247,0.12)' : 'rgba(15,23,42,0.5)', border: `1px solid ${sel ? 'rgba(168,85,247,0.35)' : 'rgba(168,85,247,0.06)'}` }}>
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    {r.first_name[0]}{r.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{r.first_name} {r.last_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500">{d}/{TOTAL_REQS} skills</span>
                      {hasFTO && <span className="text-[9px] font-bold px-1 py-0.5 rounded text-green-400 bg-green-500/10 border border-green-500/20">FTO</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: tabs panel ── */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center">
              <div className="text-center text-slate-600">
                <GraduationCap className="w-14 h-14 mx-auto mb-3 opacity-15" />
                <p className="text-sm">Select a recruit from the list</p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden flex flex-col h-full">

              {/* Recruit banner + tabs */}
              <div className="px-5 pt-4 pb-0" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                      {selected.first_name[0]}{selected.last_name[0]}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">{selected.first_name} {selected.last_name}</h2>
                      <p className="text-xs text-slate-500">{selected.rank}{selected.callsign ? ` · ${selected.callsign}` : ''} · {selected.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xl font-bold text-purple-400">{skillTotalDone(selected.id, progress)}</span>
                      <span className="text-slate-600">/{TOTAL_REQS}</span>
                      <div className="text-[10px] text-slate-600">skills done</div>
                    </div>
                    {selectedTraining && (
                      <div className="text-right">
                        <span className="text-xl font-bold text-green-400">
                          {selectedTraining.stage_statuses.filter(s => s.status === 'complete').length}
                        </span>
                        <span className="text-slate-600">/{FTO_STAGES_DEF.length}</span>
                        <div className="text-[10px] text-slate-600">FTO stages</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1">
                  {[
                    { key: 'skills', label: 'Skill Requirements', icon: BarChart2 },
                    { key: 'stages', label: 'FTO Stage Progression', icon: TrendingUp },
                  ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
                        tab === t.key
                          ? 'bg-purple-500/10 text-purple-300 border-b-2 border-sky-400'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}>
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── TAB: Skill Requirements ── */}
              {tab === 'skills' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Level tabs */}
                  <div className="flex px-4 pt-3 pb-0 gap-1 flex-wrap">
                    {SKILL_STAGES.map(s => {
                      const d = skillDone(selected.id, s.id, progress);
                      const tot = s.requirements.length;
                      const active = activeSkillStage === s.id;
                      return (
                        <button key={s.id} onClick={() => setActiveSkillStage(s.id)}
                          className="flex flex-col items-start px-4 py-2.5 rounded-t-xl transition-all min-w-[110px]"
                          style={{
                            background: active ? 'rgba(15,23,42,0.9)' : 'rgba(15,23,42,0.4)',
                            border: `1px solid ${active ? s.border : 'rgba(168,85,247,0.06)'}`,
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

                  <div className="flex-1 overflow-y-auto" style={{ borderTop: `1px solid ${stage.border}` }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
                          {['REQUIREMENT', 'STATUS', 'COMPLETED BY', 'ACTIONS'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stageReqs.map((req, i) => {
                          const prog = progress[selected.id]?.[req.id] ?? { status: 'not_started' as Status };
                          const StatusIcon = prog.status === 'completed' ? CheckCircle2
                            : prog.status === 'in_progress' ? PlayCircle
                            : prog.status === 'failed' ? XCircle : Clock;
                          return (
                            <tr key={req.id} className="hover:bg-slate-800/20 transition-colors"
                              style={{ borderBottom: i < stageReqs.length - 1 ? '1px solid rgba(168,85,247,0.06)' : 'none' }}>
                              <td className="px-4 py-3.5 min-w-[200px]">
                                <div className="font-semibold text-white text-sm">{req.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{req.desc}</div>
                                {prog.notes && <div className="text-[10px] text-amber-400/70 mt-1 italic">&ldquo;{prog.notes}&rdquo;</div>}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${STATUS_CLS[prog.status]}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {STATUS_LABEL[prog.status]}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 min-w-[130px]">
                                {prog.completed_by ? (
                                  <div>
                                    <div className="text-xs text-white font-medium">{prog.completed_by}</div>
                                    {prog.completed_at && <div className="text-[10px] text-slate-500 mt-0.5">{format(new Date(prog.completed_at), 'd MMM yyyy')}</div>}
                                  </div>
                                ) : <span className="text-slate-700 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {canEdit && (
                                    <>
                                      {prog.status === 'not_started' && (
                                        <button onClick={() => setSkillStatus(selected.id, req.id, 'in_progress')}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-purple-400"
                                          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
                                          Start
                                        </button>
                                      )}
                                      {prog.status === 'in_progress' && (<>
                                        <button onClick={() => setSkillStatus(selected.id, req.id, 'completed')}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-green-400"
                                          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                                          Passed
                                        </button>
                                        <button onClick={() => setSkillStatus(selected.id, req.id, 'failed')}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400"
                                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                          Failed
                                        </button>
                                      </>)}
                                      {prog.status === 'completed' && (
                                        <button onClick={() => setSkillStatus(selected.id, req.id, 'failed')}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400"
                                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                          Mark Failed
                                        </button>
                                      )}
                                      {prog.status === 'failed' && (
                                        <button onClick={() => setSkillStatus(selected.id, req.id, 'not_started')}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400"
                                          style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }}>
                                          Reset
                                        </button>
                                      )}
                                    </>
                                  )}
                                  <button onClick={() => { setNoteModal({ rid: selected.id, reqId: req.id }); setNoteText(prog.notes ?? ''); }}
                                    className={`p-1.5 rounded-lg transition-colors ${prog.notes ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                                    style={{ background: prog.notes ? 'rgba(245,158,11,0.10)' : 'rgba(168,85,247,0.06)', border: `1px solid ${prog.notes ? 'rgba(245,158,11,0.20)' : 'rgba(168,85,247,0.08)'}` }}>
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

              {/* ── TAB: FTO Stage Progression ── */}
              {tab === 'stages' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {!selectedTraining ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                      <TrendingUp className="w-14 h-14 text-slate-700" />
                      <div>
                        <p className="text-slate-400 font-semibold">Not enrolled in FTO programme yet</p>
                        <p className="text-slate-600 text-sm mt-1">Enrol this recruit to track their stage-by-stage progression.</p>
                      </div>
                      {canEdit && (
                        <button onClick={() => setShowAddFTO(true)} className="btn-primary flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Enrol in FTO Programme
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Progress bar */}
                      <div className="glass rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-white">Overall Progress</span>
                          <span className="text-sm text-slate-400">
                            {selectedTraining.stage_statuses.filter(s => s.status === 'complete').length}/{FTO_STAGES_DEF.length} stages
                            {selectedTraining.fto_name && <span className="ml-2 text-slate-600">· FTO: {selectedTraining.fto_name}</span>}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{
                            width: `${Math.round(selectedTraining.stage_statuses.filter(s => s.status === 'complete').length / FTO_STAGES_DEF.length * 100)}%`
                          }} />
                        </div>
                      </div>

                      {/* Stage grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedTraining.stage_statuses.map((s, i) => {
                          const Icon = s.status === 'complete' ? CheckCircle : s.status === 'current' ? Clock : X;
                          return (
                            <div key={s.name} className={`rounded-xl p-4 border ${stageBg(s.status)}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.1)', color: '#64748b' }}>
                                  Stage {i + 1}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 flex-shrink-0 ${stageColor(s.status)}`} />
                                <span className={`text-sm font-semibold ${stageColor(s.status)}`}>{s.name}</span>
                              </div>
                              {s.date && <div className="text-xs text-slate-600 mt-1">{format(new Date(s.date), 'dd MMM yyyy')}</div>}
                              {s.status === 'current' && <div className="text-[10px] text-purple-400 mt-1 font-bold">● Current Stage</div>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Advance / Final Sign-Off actions */}
                      {canEdit && (
                        <div className="flex justify-end pt-2">
                          {selectedTraining.stage_index < FTO_STAGES_DEF.length - 1 ? (
                            <button onClick={advanceFTO} className="btn-primary flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" /> Advance to Next Stage
                            </button>
                          ) : selectedTraining.stage_statuses.every(s => s.status === 'complete') ? (
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-green-400"
                              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                              <CheckCircle className="w-4 h-4" /> All stages complete — promoted
                            </span>
                          ) : (
                            <button onClick={() => setShowSignOff(true)}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-100"
                              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: '1px solid rgba(124,58,237,0.5)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
                              <Award className="w-4 h-4" /> Final Sign-Off
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Note modal ── */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h3 className="font-bold text-white text-sm">Add Note</h3>
              <button onClick={() => setNoteModal(null)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Enter note for this requirement…" className="nx-input resize-none text-sm w-full" />
              <div className="flex gap-2">
                <button onClick={() => setNoteModal(null)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                <button onClick={saveNote} disabled={savingNote} className="btn-primary flex-1 py-2 text-sm">{savingNote ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Final Sign-Off confirmation modal ── */}
      {showSignOff && selected && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0a1020', border: '1px solid rgba(124,58,237,0.35)' }}>
            <div className="p-6" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(168,85,247,0.08))', borderBottom: '1px solid rgba(124,58,237,0.20)' }}>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}>
                  <Award className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Final Sign-Off</h2>
              </div>
              <p className="text-slate-400 text-sm mt-2">This will complete FTO training and promote the recruit.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                    {selected.first_name[0]}{selected.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white">{selected.first_name} {selected.last_name}</p>
                    <p className="text-xs text-slate-500">{selected.callsign ?? ''} · {selected.department}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Current rank:</span>
                  <span className="font-semibold text-white">{selected.rank || 'Recruit'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-500 text-sm">Promoting to:</span>
                  <span className="font-bold text-purple-300 text-sm">Probationary Constable</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 text-center">This action is logged and cannot be undone without using User Management.</p>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowSignOff(false)} disabled={signingOff} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button onClick={finalSignOff} disabled={signingOff}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: '1px solid rgba(124,58,237,0.5)' }}>
                  {signingOff ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing Off…</>
                  ) : (
                    <><Award className="w-4 h-4" /> Confirm & Promote</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add to FTO modal ── */}
      {showAddFTO && selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h2 className="font-bold text-white">Enrol in FTO Programme</h2>
              <button onClick={() => setShowAddFTO(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={addToFTO} className="p-5 space-y-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                <p className="text-sm text-white font-semibold">{selected.first_name} {selected.last_name}</p>
                <p className="text-xs text-slate-500">{selected.rank} · {selected.department}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Assigned FTO (optional)</label>
                <input value={ftoForm.fto_name} onChange={e => setFtoForm(p => ({ ...p, fto_name: e.target.value }))}
                  placeholder="FTO Name or Callsign" className="nx-input" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddFTO(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={savingFTO} className="btn-primary flex-1">{savingFTO ? 'Enrolling…' : 'Enrol'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
