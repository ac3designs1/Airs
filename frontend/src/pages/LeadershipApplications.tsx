import { useEffect, useState } from 'react';
import {
  ClipboardList, Search, CheckCircle2, XCircle, Clock, MessageSquare,
  ChevronDown, User, Calendar, Globe, Trash2, Loader2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Application {
  id: string; full_name: string; discord: string; age: number;
  timezone: string; experience: string; why_join: string;
  availability: string; referral: string;
  status: 'pending' | 'interview' | 'approved' | 'denied';
  reviewed_by?: string; review_notes?: string; reviewed_at?: string;
  created_at: string;
}

const LEADERSHIP = ['commissioner', 'commissioner', 'admin', 'administrator', 'leadership', 'senior_command', 'supervisor'];

const STATUS_CFG = {
  pending:   { label: 'Pending',   cls: 'chip-yellow', dot: '#fcd34d' },
  interview: { label: 'Interview', cls: 'chip-blue',   dot: '#38bdf8' },
  approved:  { label: 'Approved',  cls: 'chip-green',  dot: '#4ade80' },
  denied:    { label: 'Denied',    cls: 'chip-red',    dot: '#f87171' },
};

export default function LeadershipApplications() {
  const { auth } = useAuth();
  if (!LEADERSHIP.includes(auth.user?.role ?? '')) return <Navigate to="/dashboard" replace />;

  const [apps,       setApps]       = useState<Application[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<'all' | Application['status']>('all');
  const [selected,   setSelected]   = useState<Application | null>(null);
  const [noteText,   setNoteText]   = useState('');
  const [saving,     setSaving]     = useState<string | null>(null);

  useEffect(() => {
    api.get('/applications').then(r => { setApps(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    return (filter === 'all' || a.status === filter)
      && (!q || `${a.full_name} ${a.discord}`.toLowerCase().includes(q));
  });

  const counts = {
    all: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    interview: apps.filter(a => a.status === 'interview').length,
    approved: apps.filter(a => a.status === 'approved').length,
    denied: apps.filter(a => a.status === 'denied').length,
  };

  const STATUS_MSGS: Record<string, string> = {
    approved:  '✅ Application approved — Discord DM sent!',
    denied:    '❌ Application denied — Discord DM sent.',
    interview: '📅 Moved to interview.',
    pending:   'Reset to pending.',
  };

  async function updateStatus(id: string, status: Application['status'], notes?: string) {
    setSaving(status);
    try {
      const updated = await api.put(`/applications/${id}`, { status, review_notes: notes ?? noteText });
      setApps(prev => prev.map(a => a.id === id ? { ...a, ...updated.data } : a));
      if (selected?.id === id) setSelected(s => s ? { ...s, ...updated.data } : s);
      toast.success(STATUS_MSGS[status] ?? 'Updated');
    } catch {
      toast.error('Failed to update status. Try again.');
    } finally {
      setSaving(null);
    }
  }

  async function deleteApp(id: string) {
    if (!confirm('Delete this application?')) return;
    await api.delete(`/applications/${id}`);
    setApps(prev => prev.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(251,191,36,0.04),rgba(168,85,247,0.06))', border: '1px solid rgba(245,158,11,0.18)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <ClipboardList className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Recruitment Applications</h1>
              <p className="text-slate-500 text-sm">{counts.pending} pending review · {apps.length} total submissions</p>
            </div>
          </div>
          {counts.pending > 0 && (
            <div className="px-3 py-1.5 rounded-xl text-sm font-bold text-amber-400 animate-pulse"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              {counts.pending} Awaiting Review
            </div>
          )}
        </div>
      </div>

      {/* Stat tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'interview', 'approved', 'denied'] as const).map(s => {
          const cfg = s === 'all' ? null : STATUS_CFG[s];
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all capitalize flex items-center gap-2 ${filter === s ? (cfg ? cfg.cls : 'chip-blue') : 'chip-gray hover:text-slate-300'}`}>
              {cfg && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />}
              {s} <span className="opacity-60">({counts[s]})</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / discord…"
            className="nx-input pl-9 text-sm py-2" style={{ minWidth: 200 }} />
        </div>
      </div>

      <div className="flex gap-4 min-h-[500px]">
        {/* Application list */}
        <div className="flex flex-col gap-2 w-80 flex-shrink-0 overflow-y-auto max-h-[620px]">
          {loading ? (
            <div className="text-center py-12 text-slate-600 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-slate-600">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No applications found</p>
              {counts.all === 0 && <p className="text-xs text-slate-700 mt-1">Share the link <span className="text-purple-400 font-mono">/apply</span> to receive applications</p>}
            </div>
          ) : filtered.map(a => {
            const sc = STATUS_CFG[a.status];
            const sel = selected?.id === a.id;
            return (
              <button key={a.id} onClick={() => { setSelected(a); setNoteText(a.review_notes ?? ''); }}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{ background: sel ? 'rgba(245,158,11,0.08)' : 'rgba(15,23,42,0.6)', border: `1px solid ${sel ? 'rgba(245,158,11,0.30)' : 'rgba(168,85,247,0.06)'}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold text-white text-sm">{a.full_name}</div>
                    <div className="text-xs text-purple-400 font-mono mt-0.5">{a.discord}</div>
                  </div>
                  <span className={`chip text-[10px] flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-600">
                  <span>Age {a.age}</span>
                  <span>·</span>
                  <span>{a.timezone}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass rounded-2xl h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-15" />
                <p className="text-sm">Select an application to review</p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden flex flex-col h-full">
              {/* Applicant header */}
              <div className="p-5 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
                    {selected.full_name[0]}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selected.full_name}</h2>
                    <p className="text-purple-400 font-mono text-sm">{selected.discord}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> Age {selected.age}</span>
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {selected.timezone}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(selected.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`chip capitalize ${STATUS_CFG[selected.status].cls}`}>{STATUS_CFG[selected.status].label}</span>
                  <button onClick={() => deleteApp(selected.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: 'Availability', v: selected.availability },
                    { l: 'Referral', v: selected.referral },
                  ].map(r => (
                    <div key={r.l} className="rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                      <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">{r.l}</div>
                      <div className="text-sm text-slate-300">{r.v}</div>
                    </div>
                  ))}
                </div>

                {/* Experience */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">FiveM Experience</div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.experience || 'No experience listed.'}</p>
                </div>

                {/* Why join */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.06)' }}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">Why they want to join</div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.why_join}</p>
                </div>

                {/* Review notes */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Leadership Notes
                  </div>
                  <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Add notes visible to leadership only (reason for decision, interview date, etc.)…"
                    className="nx-input resize-none text-sm w-full" />
                  {selected.reviewed_by && (
                    <p className="text-[10px] text-slate-600 mt-1.5">Last reviewed by <span className="text-slate-400">{selected.reviewed_by}</span>
                      {selected.reviewed_at && ` · ${format(new Date(selected.reviewed_at), 'dd MMM yyyy, HH:mm')}`}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {([
                    { s: 'interview', label: 'Move to Interview', Icon: Clock,        bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.25)',  color: '#38bdf8' },
                    { s: 'approved',  label: 'Approve',           Icon: CheckCircle2, bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',   color: '#4ade80' },
                    { s: 'pending',   label: 'Reset to Pending',  Icon: ChevronDown,  bg: 'rgba(100,116,139,0.10)',border: 'rgba(100,116,139,0.20)', color: '#94a3b8' },
                    { s: 'denied',    label: 'Deny',              Icon: XCircle,      bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)',   color: '#f87171' },
                  ] as const).map(({ s, label, Icon, bg, border, color }) => (
                    <button key={s}
                      onClick={() => updateStatus(selected.id, s as Application['status'], noteText)}
                      disabled={saving !== null}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: saving === s ? `${bg}` : bg, border: `1px solid ${border}`, color }}>
                      {saving === s
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Icon className="w-3.5 h-3.5" />}
                      {saving === s ? 'Saving…' : label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
