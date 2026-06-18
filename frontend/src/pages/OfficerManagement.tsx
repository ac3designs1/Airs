import { useEffect, useState } from 'react';
import { Users, Search, Clock, Shield, TrendingUp, ChevronRight, X, FileText, Star, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { ALL_SPECIAL_ROLES, SPECIAL_ROLE_LABELS, type SpecialRole } from '../contexts/AuthContext';

interface Officer {
  id: string; callsign: string; first_name: string; last_name: string;
  rank: string; department: string; status: string; role: string;
  special_roles: SpecialRole[]; created_at: string; last_login?: string;
}
interface OfficerStats {
  total_hours: number; month_hours: number; total_shifts: number;
  incidents: number; arrests: number; reports: number;
  certifications: number; active_strikes: number; warrants_issued: number;
}

const STATUS_CLS: Record<string, string> = {
  on_duty: 'chip chip-green', busy: 'chip chip-yellow',
  off_duty: 'chip chip-gray', unavailable: 'chip chip-red',
};

const SPECIAL_ROLE_COLORS: Record<SpecialRole, string> = {
  fto:               'bg-blue-500/15 text-blue-300 border border-blue-500/25',
  senior_fto:        'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
  cirt_fto:          'bg-red-500/15 text-red-300 border border-red-500/25',
  academy_leadership:'bg-amber-500/15 text-amber-300 border border-amber-500/25',
};

export default function OfficerManagement() {
  const { auth } = useAuth();
  const userRole = auth.user?.role ?? '';
  const isSeniorCmd = ['commissioner','admin','administrator','senior_command'].includes(userRole);
  const isLeadership = ['commissioner','admin','administrator','leadership','senior_command','supervisor'].includes(userRole);

  const [officers,   setOfficers]   = useState<Officer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState<Officer | null>(null);
  const [stats,      setStats]      = useState<OfficerStats | null>(null);
  const [loadStats,  setLoadStats]  = useState(false);
  const [srLoading,  setSrLoading]  = useState(false);
  const [srError,    setSrError]    = useState('');

  useEffect(() => {
    api.get('/roster').then(r => {
      setOfficers(r.data.map((o: Officer) => ({ ...o, special_roles: o.special_roles ?? [] })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function openDetail(o: Officer) {
    setSelected({ ...o, special_roles: o.special_roles ?? [] });
    setStats(null); setSrError('');
    if (!isLeadership) return;
    setLoadStats(true);
    try { const r = await api.get(`/stats/officer/${o.id}`); setStats(r.data); }
    catch { /* non-fatal */ }
    finally { setLoadStats(false); }
  }

  async function toggleSpecialRole(role: SpecialRole, action: 'add' | 'remove') {
    if (!selected) return;
    setSrLoading(true); setSrError('');
    try {
      const r = await api.put(`/roster/${selected.id}/special-roles`, { action, role });
      const updated = { ...selected, special_roles: r.data.special_roles };
      setSelected(updated);
      setOfficers(prev => prev.map(o => o.id === selected.id ? { ...o, special_roles: r.data.special_roles } : o));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setSrError(err.response?.data?.error ?? 'Failed to update role');
    } finally { setSrLoading(false); }
  }

  const filtered = officers.filter(o => {
    const q = search.toLowerCase();
    return !q || `${o.first_name} ${o.last_name} ${o.callsign ?? ''}`.toLowerCase().includes(q);
  });

  const onDuty = officers.filter(o => o.status !== 'off_duty').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header scan-line"
        style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.18)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Officer Management</h1>
            <p className="text-slate-500 text-sm">Roster, records, and performance metrics</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-xl font-black text-white">{officers.length}</div>
              <div className="text-xs text-slate-500">Total Officers</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-400">{onDuty}</div>
              <div className="text-xs text-slate-500">On Duty</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search by name or callsign…" value={search} onChange={e => setSearch(e.target.value)}
          className="nx-input pl-9" />
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0a1020', border: '1px solid rgba(168,85,247,0.18)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
              <h2 className="font-bold text-white">Officer Record</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  {selected.first_name[0]}{selected.last_name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">{selected.first_name} {selected.last_name}</h3>
                    {selected.callsign && <span className="chip chip-blue font-mono">{selected.callsign}</span>}
                    <span className={STATUS_CLS[selected.status] ?? 'chip chip-gray'}>
                      {selected.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{selected.rank} · {selected.department}</p>
                </div>
              </div>

              {/* Stats grid — only for leadership */}
              {isLeadership && (
                <div className="grid grid-cols-3 gap-3">
                  {loadStats ? (
                    [...Array(6)].map((_,i) => <div key={i} className="skeleton rounded-xl h-16" />)
                  ) : stats ? [
                    { label: 'Hours (MTD)', value: `${stats.month_hours}h`, icon: Clock,     color: 'text-blue-400',   bg: 'rgba(59,130,246,0.10)' },
                    { label: 'Total Hours', value: `${stats.total_hours}h`, icon: Clock,     color: 'text-purple-400', bg: 'rgba(168,85,247,0.10)' },
                    { label: 'Incidents',   value: stats.incidents,         icon: FileText,  color: 'text-amber-400',  bg: 'rgba(245,158,11,0.10)' },
                    { label: 'Arrests',     value: stats.arrests,           icon: Shield,    color: 'text-red-400',    bg: 'rgba(239,68,68,0.10)' },
                    { label: 'Certs',       value: stats.certifications,    icon: Star,      color: 'text-yellow-400', bg: 'rgba(234,179,8,0.10)' },
                    { label: 'Strikes',     value: stats.active_strikes,    icon: TrendingUp, color: stats.active_strikes > 0 ? 'text-red-400' : 'text-green-400', bg: stats.active_strikes > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.bg.replace('0.10','0.20')}` }}>
                      <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-slate-500">{s.label}</div>
                    </div>
                  )) : null}
                </div>
              )}

              {/* Details */}
              <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.08)' }}>
                {[
                  { label: 'Role',       value: selected.role?.replace('_', ' ') },
                  { label: 'Joined',     value: format(new Date(selected.created_at), 'dd MMM yyyy') },
                  { label: 'Last Login', value: selected.last_login ? format(new Date(selected.last_login), 'dd MMM yyyy h:mm a') : 'Never' },
                ].map((row, i) => (
                  <div key={row.label} className="flex justify-between px-4 py-3" style={{ borderBottom: i < 2 ? '1px solid rgba(168,85,247,0.06)' : 'none', background: i % 2 === 0 ? 'rgba(168,85,247,0.02)' : 'transparent' }}>
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm font-medium text-white capitalize">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Special Roles — visible to all leadership, editable by senior_command+ */}
              {isLeadership && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.12)', background: 'rgba(168,85,247,0.03)' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
                    <span className="text-sm font-semibold text-slate-300">Special Roles / Permissions</span>
                    {selected.special_roles.length > 0 && (
                      <span className="text-xs text-purple-400">{selected.special_roles.length} active</span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Current special roles */}
                    {selected.special_roles.length === 0 ? (
                      <p className="text-sm text-slate-600 italic">No special roles assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selected.special_roles.map(sr => (
                          <span key={sr} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${SPECIAL_ROLE_COLORS[sr]}`}>
                            {SPECIAL_ROLE_LABELS[sr]}
                            {isSeniorCmd && (
                              <button
                                onClick={() => toggleSpecialRole(sr, 'remove')}
                                disabled={srLoading}
                                className="ml-0.5 hover:text-red-400 transition-colors"
                                title={`Remove ${SPECIAL_ROLE_LABELS[sr]}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add special role — Senior Command only */}
                    {isSeniorCmd && (
                      <div>
                        <p className="text-xs text-slate-600 mb-2">Add role:</p>
                        <div className="flex flex-wrap gap-2">
                          {ALL_SPECIAL_ROLES.filter(sr => !selected.special_roles.includes(sr)).map(sr => (
                            <button
                              key={sr}
                              onClick={() => toggleSpecialRole(sr, 'add')}
                              disabled={srLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                              style={{ background: 'rgba(168,85,247,0.08)', border: '1px dashed rgba(168,85,247,0.25)', color: '#c084fc' }}
                            >
                              <Plus className="w-3 h-3" />
                              {SPECIAL_ROLE_LABELS[sr]}
                            </button>
                          ))}
                          {ALL_SPECIAL_ROLES.every(sr => selected.special_roles.includes(sr)) && (
                            <span className="text-xs text-slate-600 italic">All roles assigned</span>
                          )}
                        </div>
                      </div>
                    )}
                    {srError && <p className="text-xs text-red-400">{srError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Officer list */}
      <div className="space-y-2">
        {loading ? (
          [...Array(4)].map((_,i) => <div key={i} className="skeleton rounded-xl h-[72px]" />)
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-slate-600">No officers found.</div>
        ) : filtered.map(o => (
          <button key={o.id} onClick={() => openDetail(o)}
            className="w-full glass rounded-xl p-4 hover:border-purple-500/20 transition-all text-left group flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {o.first_name[0]}{o.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">{o.first_name} {o.last_name}</span>
                {o.callsign && <span className="text-xs font-mono text-purple-400">{o.callsign}</span>}
                <span className={STATUS_CLS[o.status] ?? 'chip chip-gray'}>{o.status?.replace('_', ' ')}</span>
                {(o.special_roles ?? []).map(sr => (
                  <span key={sr} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${SPECIAL_ROLE_COLORS[sr]}`}>
                    {SPECIAL_ROLE_LABELS[sr]}
                  </span>
                ))}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">{o.rank} · {o.department}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
