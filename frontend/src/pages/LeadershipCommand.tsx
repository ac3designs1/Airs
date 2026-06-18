import { useEffect, useState, useCallback } from 'react';
import {
  Crown, Users, Bell, TrendingUp, Search, X, ChevronDown,
  CheckCircle, Shield, AlertTriangle, ArrowRightLeft,
  Star, UserMinus, Zap, Edit2, Trash2, AlertOctagon,
  RefreshCw, Clock, Activity, FileText, Megaphone, Save, CalendarClock
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/* ── Types ─────────────────────────────────────────────── */
interface Officer {
  id: string; username: string; first_name: string; last_name: string;
  rank: string; department: string; role: string; status: string; callsign?: string;
  created_at: string; last_login?: string;
}
interface PendingItem {
  id: string; kind: 'leave' | 'transfer' | 'cert' | 'application';
  officer_name: string; callsign?: string; title: string; detail: string;
  created_at: string;
}
interface DashStats { total: number; onDuty: number; pending: number; activeWarrants: number; }

/* ── Constants ──────────────────────────────────────────── */
const RANKS = [
  'Recruit','Probationary Constable','Constable','First Constable','Senior Constable',
  'Leading Senior Constable','Sergeant','Senior Sergeant','Inspector',
  'Superintendent','Commander','Assistant Commissioner','Deputy Commissioner','Commissioner',
];
const DEPARTMENTS = ['Academy','GD','Highway','CIRT','SOG'];
// 'commissioner' is hidden — not assignable via UI dropdown
const ROLES = ['recruit','officer','supervisor','leadership','senior_command','administrator','admin'];

const ROLE_CLS: Record<string, string> = {
  admin: 'chip chip-red', administrator: 'chip chip-red', senior_command: 'chip chip-orange',
  leadership: 'chip chip-gold', supervisor: 'chip chip-yellow',
  officer: 'chip chip-blue', recruit: 'chip chip-purple',
};
const STATUS_CLS: Record<string, string> = {
  on_duty: 'chip chip-green', busy: 'chip chip-yellow',
  off_duty: 'chip chip-gray', unavailable: 'chip chip-red',
};
const DEPT_COLOR: Record<string, string> = {
  Academy: '#06b6d4', GD: '#3b82f6', Highway: '#f59e0b', CIRT: '#ef4444', SOG: '#8b5cf6',
};

type Tab = 'personnel' | 'approvals' | 'actions';

/* ── Edit modal state ───────────────────────────────────── */
interface EditState {
  officer: Officer;
  rank: string; department: string; role: string; callsign: string; status: string;
}

/* ── Strike modal state ─────────────────────────────────── */
interface StrikeState { officer: Officer; reason: string; severity: 'minor' | 'major' | 'critical'; }

/* ── Announce modal ─────────────────────────────────────── */
interface AnnounceState { title: string; content: string; category: string; pinned: boolean; }

/* ─────────────────────────────────────────────────────────
   Component
────────────────────────────────────────────────────────── */
export default function LeadershipCommand() {
  const { auth } = useAuth();
  const LEADERSHIP = ['commissioner','admin','administrator','leadership','senior_command','supervisor'];
  if (!LEADERSHIP.includes(auth.user?.role ?? '')) return <Navigate to="/dashboard" replace />;

  const canPromote = ['commissioner','admin','administrator','leadership','senior_command','supervisor'].includes(auth.user?.role ?? '');

  /* ── State ── */
  const [tab,       setTab]      = useState<Tab>('personnel');
  const [officers,  setOfficers] = useState<Officer[]>([]);
  const [pending,   setPending]  = useState<PendingItem[]>([]);
  const [stats,     setStats]    = useState<DashStats>({ total: 0, onDuty: 0, pending: 0, activeWarrants: 0 });
  const [loading,   setLoading]  = useState(true);
  const [search,    setSearch]   = useState('');
  const [deptFilter,setDeptFilter] = useState('');
  const [editing,   setEditing]  = useState<EditState | null>(null);
  const [striking,  setStriking] = useState<StrikeState | null>(null);
  const [announcing,setAnnouncing] = useState<AnnounceState | null>(null);
  const [saving,    setSaving]   = useState(false);
  const [confirmDel,setConfirmDel] = useState<Officer | null>(null);
  const [interviewModal, setInterviewModal] = useState<{ item: PendingItem; times: string[]; note: string } | null>(null);

  /* ── Load data ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, lRes, tRes, cRes, aRes, sRes] = await Promise.all([
        api.get('/roster'),
        api.get('/leave'),
        api.get('/transfers'),
        api.get('/certifications'),
        api.get('/applications'),
        api.get('/dispatch/stats'),
      ]);

      const offs: Officer[] = oRes.data;
      setOfficers(offs);
      setStats({
        total: offs.length,
        onDuty: offs.filter(o => o.status !== 'off_duty').length,
        pending: 0, // will compute below
        activeWarrants: sRes.data.active_warrants ?? 0,
      });

      const items: PendingItem[] = [
        ...(lRes.data as { id: string; officer_name: string; callsign?: string; leave_type: string; start_date: string; end_date: string; status: string; created_at: string }[])
          .filter(x => x.status === 'pending')
          .map(x => ({ id: x.id, kind: 'leave' as const, officer_name: x.officer_name, callsign: x.callsign, title: `${x.leave_type?.replace('_',' ')} Leave`, detail: `${format(new Date(x.start_date),'dd MMM')} → ${format(new Date(x.end_date),'dd MMM yyyy')}`, created_at: x.created_at })),
        ...((tRes.data?.transfers ?? tRes.data ?? []) as { id: string; officer_name: string; officer_callsign?: string; from_division: string; to_division: string; status: string; created_at: string }[])
          .filter(x => x.status === 'pending')
          .map(x => ({ id: x.id, kind: 'transfer' as const, officer_name: x.officer_name, callsign: x.officer_callsign, title: 'Division Transfer', detail: `${x.from_division} → ${x.to_division}`, created_at: x.created_at })),
        ...(cRes.data as { id: string; officer_name: string; callsign?: string; cert_name: string; status: string; created_at: string }[])
          .filter(x => x.status === 'pending')
          .map(x => ({ id: x.id, kind: 'cert' as const, officer_name: x.officer_name, callsign: x.callsign, title: `Cert: ${x.cert_name}`, detail: 'Awaiting approval', created_at: x.created_at })),
        ...(aRes.data as { id: string; full_name: string; status: string; created_at: string }[])
          .filter(x => x.status === 'pending')
          .map(x => ({ id: x.id, kind: 'application' as const, officer_name: x.full_name, title: 'New Application', detail: 'Officer application awaiting review', created_at: x.created_at })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPending(items);
      setStats(prev => ({ ...prev, pending: items.length }));
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filtered officers ── */
  const filtered = officers.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${o.first_name} ${o.last_name} ${o.callsign ?? ''} ${o.username}`.toLowerCase().includes(q);
    const matchDept = !deptFilter || o.department === deptFilter;
    return matchSearch && matchDept;
  });

  /* ── Open edit ── */
  function openEdit(o: Officer) {
    setEditing({ officer: o, rank: o.rank, department: o.department, role: o.role, callsign: o.callsign ?? '', status: o.status });
  }

  /* ── Save edit ── */
  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await api.put(`/roster/${editing.officer.id}`, {
        rank: editing.rank, department: editing.department,
        role: editing.role, callsign: editing.callsign || null,
        status: editing.status,
        first_name: editing.officer.first_name, last_name: editing.officer.last_name,
      });
      setOfficers(prev => prev.map(o => o.id === editing.officer.id ? res.data : o));
      setEditing(null);
      toast.success('Officer updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  /* ── Quick promote (one rank up) ── */
  async function quickPromote(o: Officer) {
    const idx = RANKS.indexOf(o.rank);
    if (idx >= RANKS.length - 1) return toast.error('Already at highest rank');
    const newRank = RANKS[idx + 1];
    try {
      await api.post('/promotions', { officer_id: o.id, to_rank: newRank, reason: 'Promoted via Leadership Command' });
      setOfficers(prev => prev.map(x => x.id === o.id ? { ...x, rank: newRank } : x));
      toast.success(`${o.first_name} promoted to ${newRank}`);
    } catch { toast.error('Promotion failed'); }
  }

  /* ── Suspend/unsuspend ── */
  async function toggleSuspend(o: Officer) {
    const newStatus = o.status === 'unavailable' ? 'off_duty' : 'unavailable';
    try {
      const res = await api.put(`/roster/${o.id}`, { ...o, status: newStatus });
      setOfficers(prev => prev.map(x => x.id === o.id ? res.data : x));
      toast.success(newStatus === 'unavailable' ? `${o.first_name} suspended` : `${o.first_name} unsuspended`);
    } catch { toast.error('Failed'); }
  }

  /* ── Fire officer ── */
  async function fireOfficer(o: Officer) {
    try {
      await api.delete(`/roster/${o.id}`);
      setOfficers(prev => prev.filter(x => x.id !== o.id));
      setConfirmDel(null);
      toast.success(`${o.first_name} ${o.last_name} removed from roster`);
    } catch { toast.error('Failed to remove officer'); }
  }

  /* ── Issue strike ── */
  async function issueStrike() {
    if (!striking?.reason) return toast.error('Reason required');
    setSaving(true);
    try {
      await api.post('/strikes', {
        officer_id: striking.officer.id, reason: striking.reason, severity: striking.severity,
      });
      setStriking(null);
      toast.success(`Strike issued to ${striking.officer.first_name}`);
    } catch { toast.error('Failed to issue strike'); }
    finally { setSaving(false); }
  }

  /* ── Approve / deny pending item ── */
  async function reviewItem(item: PendingItem, status: 'approved' | 'denied') {
    try {
      if (item.kind === 'leave') await api.put(`/leave/${item.id}`, { status });
      else if (item.kind === 'transfer') await api.put(`/transfers/${item.id}`, { status });
      else if (item.kind === 'cert') await api.put(`/certifications/${item.id}`, { status });
      else if (item.kind === 'application') await api.put(`/applications/${item.id}`, { status });
      setPending(prev => prev.filter(p => p.id !== item.id));
      setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
      toast.success(`${status === 'approved' ? 'Approved' : 'Denied'}`);
    } catch { toast.error('Failed to review'); }
  }

  /* ── Move application to interview ── */
  async function confirmInterview() {
    if (!interviewModal) return;
    setSaving(true);
    try {
      const msg = [
        ...interviewModal.times,
        interviewModal.note ? `\nNote: ${interviewModal.note}` : '',
      ].filter(Boolean).join('\n');
      await api.put(`/applications/${interviewModal.item.id}`, {
        status: 'interview',
        interview_message: msg || undefined,
      });
      setPending(prev => prev.filter(p => p.id !== interviewModal.item.id));
      setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
      setInterviewModal(null);
      toast.success('Moved to interview — Discord DM sent!');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  /* ── Post announcement ── */
  async function postAnnouncement() {
    if (!announcing?.title || !announcing.content) return toast.error('Title and content required');
    setSaving(true);
    try {
      await api.post('/announcements', announcing);
      setAnnouncing(null);
      toast.success('Announcement posted');
    } catch { toast.error('Failed to post'); }
    finally { setSaving(false); }
  }

  const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    leave: Clock, transfer: ArrowRightLeft, cert: Star, application: Users,
  };
  const KIND_CLS: Record<string, string> = {
    leave: 'chip chip-blue', transfer: 'chip chip-purple', cert: 'chip chip-gold', application: 'chip chip-green',
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden p-5 scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.14),rgba(239,68,68,0.06),rgba(6,182,212,0.06))', border: '1px solid rgba(245,158,11,0.22)' }}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)' }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)' }}>
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Leadership Command
                <span className="chip chip-gold text-[10px]">RESTRICTED</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Full personnel control · approve requests · issue directives</p>
            </div>
          </div>
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Officers', value: stats.total,          icon: Users,         color: 'text-sky-400',    bg: 'rgba(6,182,212,0.10)' },
          { label: 'On Duty Now',    value: stats.onDuty,         icon: Activity,      color: 'text-green-400',  bg: 'rgba(34,197,94,0.10)' },
          { label: 'Pending Items',  value: stats.pending,        icon: Bell,          color: stats.pending > 0 ? 'text-amber-400' : 'text-slate-400', bg: stats.pending > 0 ? 'rgba(245,158,11,0.10)' : 'rgba(71,85,105,0.10)' },
          { label: 'Active Warrants',value: stats.activeWarrants, icon: AlertTriangle, color: stats.activeWarrants > 0 ? 'text-red-400' : 'text-slate-400', bg: stats.activeWarrants > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(71,85,105,0.10)' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className="p-2 rounded-lg w-fit mb-2" style={{ background: s.bg }}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.10)' }}>
        {([
          { id: 'personnel', label: 'Personnel', icon: Users, badge: officers.length },
          { id: 'approvals', label: 'Approvals Queue', icon: Bell, badge: stats.pending },
          { id: 'actions',   label: 'Quick Actions', icon: Zap },
        ] as { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'text-slate-500 hover:text-slate-300'}`}>
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge != null && t.badge > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          TAB: PERSONNEL
      ════════════════════════════════════════════════════ */}
      {tab === 'personnel' && (
        <div className="space-y-4">
          {/* Search + dept filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, callsign, username…" className="nx-input pl-9" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="nx-input w-40" style={{ colorScheme: 'dark' }}>
              <option value="">All Depts</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Officer table */}
          <div className="glass rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-600">Loading personnel…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No officers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="nx-table min-w-[860px]">
                  <thead>
                    <tr>
                      <th>Officer</th><th>Callsign</th><th>Rank</th><th>Division</th>
                      <th>Role</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr key={o.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#0284c7,#6366f1)' }}>
                              {o.first_name[0]}{o.last_name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{o.first_name} {o.last_name}</div>
                              <div className="text-[10px] text-slate-600 font-mono">{o.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-sky-400 text-xs">{o.callsign || '—'}</td>
                        <td className="text-sm text-slate-300">{o.rank}</td>
                        <td>
                          <span className="chip text-[10px]"
                            style={{ background: `${DEPT_COLOR[o.department] ?? '#64748b'}18`, border: `1px solid ${DEPT_COLOR[o.department] ?? '#64748b'}33`, color: DEPT_COLOR[o.department] ?? '#94a3b8' }}>
                            {o.department}
                          </span>
                        </td>
                        <td><span className={`${ROLE_CLS[o.role] ?? 'chip chip-gray'} capitalize`}>{o.role}</span></td>
                        <td><span className={`${STATUS_CLS[o.status] ?? 'chip chip-gray'} capitalize`}>{o.status?.replace('_',' ')}</span></td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {/* Promote */}
                            {canPromote && (
                            <button title="Promote one rank" onClick={() => quickPromote(o)}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/15 transition-colors" style={{ border: '1px solid rgba(34,197,94,0.20)' }}>
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            )}
                            {/* Edit */}
                            <button title="Edit officer" onClick={() => openEdit(o)}
                              className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/15 transition-colors" style={{ border: '1px solid rgba(6,182,212,0.20)' }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Strike */}
                            <button title="Issue strike" onClick={() => setStriking({ officer: o, reason: '', severity: 'minor' })}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/15 transition-colors" style={{ border: '1px solid rgba(245,158,11,0.20)' }}>
                              <AlertOctagon className="w-3.5 h-3.5" />
                            </button>
                            {/* Suspend */}
                            {o.id !== auth.user?.id && (
                              <button title={o.status === 'unavailable' ? 'Unsuspend' : 'Suspend'} onClick={() => toggleSuspend(o)}
                                className={`p-1.5 rounded-lg transition-colors ${o.status === 'unavailable' ? 'text-yellow-400 hover:bg-yellow-500/15' : 'text-orange-400 hover:bg-orange-500/15'}`}
                                style={{ border: `1px solid ${o.status === 'unavailable' ? 'rgba(234,179,8,0.20)' : 'rgba(249,115,22,0.20)'}` }}>
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Fire */}
                            {o.id !== auth.user?.id && (
                              <button title="Terminate officer" onClick={() => setConfirmDel(o)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors" style={{ border: '1px solid rgba(239,68,68,0.20)' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: APPROVALS QUEUE
      ════════════════════════════════════════════════════ */}
      {tab === 'approvals' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600 opacity-30" />
              <p className="text-slate-500 font-semibold">All caught up</p>
              <p className="text-slate-600 text-sm mt-1">No pending approvals.</p>
            </div>
          ) : pending.map(item => {
            const Icon = KIND_ICON[item.kind] ?? Bell;
            return (
              <div key={`${item.kind}-${item.id}`} className="glass rounded-xl p-4"
                style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <Icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={KIND_CLS[item.kind]}>{item.title}</span>
                        <span className="chip chip-yellow">Pending</span>
                      </div>
                      <div className="text-sm font-medium text-white">{item.officer_name}
                        {item.callsign && <span className="text-sky-400 font-mono text-xs ml-2">{item.callsign}</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                      <div className="text-xs text-slate-700 mt-1">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {item.kind === 'application' && (
                      <button onClick={() => setInterviewModal({ item, times: [], note: '' })}
                        className="px-3 py-1.5 rounded-lg text-indigo-400 text-xs font-bold hover:bg-indigo-500/15 transition-colors flex items-center gap-1.5"
                        style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
                        <CalendarClock className="w-3.5 h-3.5" /> Interview
                      </button>
                    )}
                    <button onClick={() => reviewItem(item, 'approved')}
                      className="px-3 py-1.5 rounded-lg text-green-400 text-xs font-bold hover:bg-green-500/15 transition-colors flex items-center gap-1.5"
                      style={{ border: '1px solid rgba(34,197,94,0.25)' }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => reviewItem(item, 'denied')}
                      className="px-3 py-1.5 rounded-lg text-red-400 text-xs font-bold hover:bg-red-500/15 transition-colors flex items-center gap-1.5"
                      style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                      <X className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: QUICK ACTIONS
      ════════════════════════════════════════════════════ */}
      {tab === 'actions' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { title: 'Post Announcement', desc: 'Broadcast a message to all officers', icon: Megaphone, color: '#06b6d4', onClick: () => setAnnouncing({ title: '', content: '', category: 'general', pinned: false }) },
            { title: 'Issue Strike', desc: 'Issue a formal strike/demerit to an officer', icon: AlertOctagon, color: '#f59e0b', onClick: () => setTab('personnel') },
            { title: 'Promote Officer', desc: 'Quick-promote from the Personnel tab', icon: TrendingUp, color: '#22c55e', onClick: () => setTab('personnel') },
            { title: 'Promotions Log', desc: 'View full promotion history', icon: Star, color: '#a855f7', onClick: () => window.location.href = '/promotions' },
            { title: 'Termination Approval', desc: 'Formal termination requests queue', icon: UserMinus, color: '#ef4444', onClick: () => window.location.href = '/termination-approval' },
            { title: 'Duty Analytics', desc: 'Department-wide performance overview', icon: Activity, color: '#6366f1', onClick: () => window.location.href = '/duty-analytics' },
            { title: 'Strikes & Demerits', desc: 'View and manage all active strikes', icon: AlertTriangle, color: '#f97316', onClick: () => window.location.href = '/strikes' },
            { title: 'Recruit Tracker', desc: 'Track recruit training progress', icon: Shield, color: '#38bdf8', onClick: () => window.location.href = '/recruit-tracker' },
            { title: 'Database Stats', desc: 'Full system record counts', icon: FileText, color: '#64748b', onClick: () => window.location.href = '/database-stats' },
          ].map(a => (
            <button key={a.title} onClick={a.onClick}
              className="glass rounded-xl p-5 text-left hover:border-opacity-50 transition-all group"
              style={{ borderColor: `${a.color}18` }}>
              <div className="p-2.5 rounded-xl w-fit mb-3 transition-transform group-hover:scale-110"
                style={{ background: `${a.color}15`, border: `1px solid ${a.color}25` }}>
                <a.icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <div className="font-semibold text-white text-sm mb-0.5">{a.title}</div>
              <div className="text-xs text-slate-500">{a.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════ */}

      {/* Edit officer modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(245,158,11,0.22)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
              <div>
                <h2 className="font-bold text-white">Edit Officer</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editing.officer.first_name} {editing.officer.last_name} · {editing.officer.username}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Callsign</label>
                <input value={editing.callsign} onChange={e => setEditing(p => p ? { ...p, callsign: e.target.value } : null)}
                  placeholder="e.g. GD-102" className="nx-input" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rank</label>
                <select value={editing.rank} onChange={e => setEditing(p => p ? { ...p, rank: e.target.value } : null)}
                  className="nx-input" style={{ colorScheme: 'dark' }}>
                  {RANKS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Division</label>
                <select value={editing.department} onChange={e => setEditing(p => p ? { ...p, department: e.target.value } : null)}
                  className="nx-input" style={{ colorScheme: 'dark' }}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role / Permission Level</label>
                <select value={editing.role} onChange={e => setEditing(p => p ? { ...p, role: e.target.value } : null)}
                  className="nx-input" style={{ colorScheme: 'dark' }}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                {editing.role === 'recruit' && <p className="text-[10px] text-purple-400 mt-1.5">This officer will appear in the Recruit Tracker.</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
                <select value={editing.status} onChange={e => setEditing(p => p ? { ...p, status: e.target.value } : null)}
                  className="nx-input" style={{ colorScheme: 'dark' }}>
                  {['on_duty','busy','off_duty','unavailable'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={saveEdit} disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue strike modal */}
      {striking && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(245,158,11,0.22)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
              <div>
                <h2 className="font-bold text-white flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-amber-400" /> Issue Strike</h2>
                <p className="text-xs text-slate-500 mt-0.5">{striking.officer.first_name} {striking.officer.last_name}</p>
              </div>
              <button onClick={() => setStriking(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Severity</label>
                <div className="flex gap-2">
                  {(['minor','major','critical'] as const).map(s => (
                    <button key={s} onClick={() => setStriking(p => p ? { ...p, severity: s } : null)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all border ${striking.severity === s
                        ? s === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : s === 'major' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                        : 'text-slate-500 border-slate-700 hover:bg-white/5'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason</label>
                <textarea rows={3} value={striking.reason} onChange={e => setStriking(p => p ? { ...p, reason: e.target.value } : null)}
                  placeholder="Describe the reason for this strike…" className="nx-input resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStriking(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={issueStrike} disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-amber-900 transition-all"
                  style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', border: '1px solid rgba(245,158,11,0.40)' }}>
                  {saving ? 'Issuing…' : 'Issue Strike'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm terminate modal */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(239,68,68,0.30)' }}>
            <div className="p-5" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
              <h2 className="font-bold text-white flex items-center gap-2"><UserMinus className="w-5 h-5 text-red-400" /> Terminate Officer</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                  {confirmDel.first_name[0]}{confirmDel.last_name[0]}
                </div>
                <div>
                  <div className="font-semibold text-white">{confirmDel.first_name} {confirmDel.last_name}</div>
                  <div className="text-xs text-slate-500">{confirmDel.rank} · {confirmDel.department}</div>
                </div>
              </div>
              <p className="text-sm text-slate-400">This will <span className="text-red-400 font-semibold">permanently remove</span> this officer from the roster. All their records will remain in the system for auditing.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => fireOfficer(confirmDel)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-all">
                  Confirm Termination
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post announcement modal */}
      {announcing && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(6,182,212,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
              <h2 className="font-bold text-white flex items-center gap-2"><Megaphone className="w-4 h-4 text-sky-400" /> Post Announcement</h2>
              <button onClick={() => setAnnouncing(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
                <input value={announcing.title} onChange={e => setAnnouncing(p => p ? { ...p, title: e.target.value } : null)}
                  placeholder="Announcement title…" className="nx-input" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                <select value={announcing.category} onChange={e => setAnnouncing(p => p ? { ...p, category: e.target.value } : null)}
                  className="nx-input" style={{ colorScheme: 'dark' }}>
                  {['general','operations','training','alert','policy'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Message</label>
                <textarea rows={4} value={announcing.content} onChange={e => setAnnouncing(p => p ? { ...p, content: e.target.value } : null)}
                  placeholder="Write your announcement…" className="nx-input resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={announcing.pinned} onChange={e => setAnnouncing(p => p ? { ...p, pinned: e.target.checked } : null)}
                  className="w-4 h-4 accent-sky-500" />
                <span className="text-sm text-slate-400">Pin this announcement</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setAnnouncing(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={postAnnouncement} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Interview modal ── */}
      {interviewModal && (() => {
        const PRESET_SLOTS = [
          'Monday 6pm–8pm AEST',
          'Tuesday 6pm–8pm AEST',
          'Wednesday 6pm–8pm AEST',
          'Thursday 6pm–8pm AEST',
          'Friday 7pm–9pm AEST',
          'Saturday 2pm–4pm AEST',
          'Saturday 7pm–9pm AEST',
          'Sunday 2pm–4pm AEST',
          'Sunday 7pm–9pm AEST',
        ];
        const toggle = (slot: string) => setInterviewModal(m => m ? ({
          ...m,
          times: m.times.includes(slot) ? m.times.filter(s => s !== slot) : [...m.times, slot],
        }) : m);
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(99,102,241,0.30)' }}>
              <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                <h2 className="font-bold text-white flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-indigo-400" /> Schedule Interview
                </h2>
                <button onClick={() => setInterviewModal(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                {/* Applicant */}
                <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                    {interviewModal.item.officer_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{interviewModal.item.officer_name}</div>
                    <div className="text-xs text-indigo-400">New application — interview stage</div>
                  </div>
                </div>

                {/* Info */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select available time slots below. The applicant will receive a Discord DM with the shortlist message and the times you select. If they don't have Discord linked, the status will still update.
                </p>

                {/* Time slot toggles */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Available Interview Times</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_SLOTS.map(slot => (
                      <button key={slot} type="button" onClick={() => toggle(slot)}
                        className={`px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-all ${interviewModal.times.includes(slot) ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        style={{
                          background: interviewModal.times.includes(slot) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${interviewModal.times.includes(slot) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        {interviewModal.times.includes(slot) ? '✓ ' : ''}{slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra note */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Additional Note <span className="text-slate-700 normal-case font-normal">(optional)</span></label>
                  <textarea rows={2} value={interviewModal.note}
                    onChange={e => setInterviewModal(m => m ? { ...m, note: e.target.value } : m)}
                    placeholder="e.g. Join our Discord and open a leadership ticket to confirm your time."
                    className="nx-input resize-none text-sm" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setInterviewModal(null)} className="btn-ghost flex-1 py-2.5">Cancel</button>
                  <button onClick={confirmInterview} disabled={saving}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: '1px solid rgba(99,102,241,0.4)' }}>
                    {saving
                      ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : <><CalendarClock className="w-4 h-4" /> Send Interview Invite</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
